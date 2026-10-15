import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { getRegions } from '../domain/Region';
import { BOT_INFRASTRUCTURE_COST_USD } from '../domain/ledger_constants';
import { LedgerTransaction } from '../domain/LedgerTransaction';
import { CostProvider } from '../services/CostProvider';
import { EventLogger } from '../services/EventLogger';
import { ExchangeRateProvider } from '../services/ExchangeRateProvider';
import { MonthlyCostSettlement } from './MonthlyCostSettlement';
import { RegisterCost } from './RegisterCost';

describe('MonthlyCostSettlement', () => {
  function makeSut() {
    const costProvider = mock<CostProvider>();
    const exchangeRateProvider = mock<ExchangeRateProvider>();
    const registerCost = mock<RegisterCost>();
    const eventLogger = mock<EventLogger>();
    const sut = new MonthlyCostSettlement({ costProvider, exchangeRateProvider, registerCost, eventLogger });
    return { sut, costProvider, exchangeRateProvider, registerCost, eventLogger };
  }

  function makeCostEntry(dedupeKey: string): LedgerTransaction {
    return {
      id: 1,
      occurredAt: new Date('2026-09-30T12:00:00.000Z'),
      type: 'COST',
      amountOriginal: 10,
      currencyOriginal: 'USD',
      amountBrlCents: -5500,
      fxRate: 5.5,
      fxSource: 'PTAX',
      source: 'Monthly infrastructure cost',
      actorDiscordId: 'system',
      dedupeKey,
      createdAt: new Date('2026-10-01T12:00:01.000Z'),
    };
  }

  it('should insert one cost per region plus bot infrastructure', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    when(costProvider.fetchCost)
      .calledWith(expect.anything())
      .thenResolve({ currency: 'USD', value: 10 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));
    const expectedSegments = getRegions().length + 1;

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: expectedSegments, skipped: 0 });
    expect(registerCost.execute).toHaveBeenCalledTimes(expectedSegments);
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
      fxRate: 5.5,
      fxSource: 'PTAX',
      occurredAt: settlementDate,
    }));
  });

  it('should skip already-settled segments without double-inserting', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    when(costProvider.fetchCost)
      .calledWith(expect.anything())
      .thenResolve({ currency: 'USD', value: 10 });
    registerCost.execute.mockResolvedValue(null);
    const expectedSegments = getRegions().length + 1;

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: 0, skipped: expectedSegments });
  });

  it('should skip zero-value region costs without registering them', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    when(costProvider.fetchCost)
      .calledWith(expect.anything())
      .thenResolve({ currency: 'USD', value: 0 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(getRegions().length);
    expect(registerCost.execute).toHaveBeenCalledTimes(1);
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should settle bot infrastructure with the shared default cost', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    when(costProvider.fetchCost)
      .calledWith(expect.anything())
      .thenResolve({ currency: 'USD', value: 0 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      amount: BOT_INFRASTRUCTURE_COST_USD,
      currency: 'USD',
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should settle remaining segments when one region fetch fails', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost, eventLogger } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    const regions = getRegions();
    costProvider.fetchCost.mockImplementation(async ({ region }) => {
      if (region === regions[0]) {
        throw new Error('Oracle cost API down');
      }
      return { currency: 'USD', value: 10 };
    });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: regions.length, skipped: 1 });
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
    expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'system',
      eventMessage: expect.stringContaining(`2026-09 ${regions[0]}`),
    }));
  });

  it('should skip a segment with an unexpected currency without aborting the rest', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    const settlementDate = new Date('2026-09-30T12:00:00.000Z');
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: settlementDate })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: settlementDate });
    const regions = getRegions();
    costProvider.fetchCost.mockImplementation(async ({ region }) => {
      if (region === regions[0]) {
        return { currency: 'EUR', value: 10 };
      }
      return { currency: 'USD', value: 10 };
    });
    registerCost.execute.mockImplementation(async (params) => {
      if (params.currency !== 'BRL' && params.currency !== 'USD') {
        throw new Error('Cost currency must be BRL or USD.');
      }
      return makeCostEntry(params.dedupeKey);
    });

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: regions.length, skipped: 1 });
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it.each([{ month: 0 }, { month: 13 }])('should reject settlement month $month', async ({ month }) => {    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();

    // When
    const attempt = sut.execute({ month, year: 2026 });

    // Then
    await expect(attempt).rejects.toThrow();
    expect(costProvider.fetchCost).not.toHaveBeenCalled();
    expect(registerCost.execute).not.toHaveBeenCalled();
  });
});
