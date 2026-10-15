import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { getRegions } from '../domain/Region';
import { LedgerTransaction } from '../domain/LedgerTransaction';
import { MoneyConfig } from '../domain/MoneyConfig';
import { CostProvider } from '../services/CostProvider';
import { EventLogger } from '../services/EventLogger';
import { ExchangeRateProvider } from '../services/ExchangeRateProvider';
import { MonthlyCostSettlement } from './MonthlyCostSettlement';
import { RegisterCost } from './RegisterCost';

const DEFAULT_MONEY_CONFIG: MoneyConfig = {
  fixedMonthlyInfrastructureCost: { amountInMinorUnits: 505, currency: 'USD' },
};

const SETTLEMENT_DATE = new Date('2026-09-30T12:00:00.000Z');

describe('MonthlyCostSettlement', () => {
  function makeSut(moneyConfig: MoneyConfig = DEFAULT_MONEY_CONFIG) {
    const costProvider = mock<CostProvider>();
    const exchangeRateProvider = mock<ExchangeRateProvider>();
    const registerCost = mock<RegisterCost>();
    const eventLogger = mock<EventLogger>();
    const sut = new MonthlyCostSettlement({ costProvider, exchangeRateProvider, registerCost, moneyConfig, eventLogger });
    return { sut, costProvider, exchangeRateProvider, registerCost, eventLogger };
  }

  function givenExchangeRate(exchangeRateProvider: ExchangeRateProvider) {
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: SETTLEMENT_DATE })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: SETTLEMENT_DATE });
  }

  function makeCostEntry(dedupeKey: string): LedgerTransaction {
    return {
      id: 1,
      occurredAt: SETTLEMENT_DATE,
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
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 10 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));
    const expectedSegments = getRegions().length + 1;

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: expectedSegments, skipped: 0, failed: 0 });
    expect(registerCost.execute).toHaveBeenCalledTimes(expectedSegments);
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
      fxRate: 5.5,
      fxSource: 'PTAX',
      occurredAt: SETTLEMENT_DATE,
    }));
  });

  it('should skip already-settled segments without double-inserting', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 10 });
    registerCost.execute.mockResolvedValue(null);
    const expectedSegments = getRegions().length + 1;

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: 0, skipped: expectedSegments, failed: 0 });
  });

  it('should skip zero-value region costs without registering them', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 0 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    const result = await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(result).toEqual({ inserted: 1, skipped: getRegions().length, failed: 0 });
    expect(registerCost.execute).toHaveBeenCalledTimes(1);
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should settle bot infrastructure from the injected money config', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 0 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5.05,
      currency: 'USD',
      fxSource: 'PTAX',
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should settle bot infrastructure in BRL without FX conversion when configured in BRL', async () => {
    // Given
    const moneyConfig: MoneyConfig = { fixedMonthlyInfrastructureCost: { amountInMinorUnits: 999, currency: 'BRL' } };
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut(moneyConfig);
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 0 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      amount: 9.99,
      currency: 'BRL',
      fxSource: 'NONE',
      fxRate: 1,
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should count a failing segment and log it without aborting the rest', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost, eventLogger } = makeSut();
    givenExchangeRate(exchangeRateProvider);
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
    expect(result).toEqual({ inserted: regions.length, skipped: 0, failed: 1 });
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
    expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'system',
      eventMessage: expect.stringContaining(`2026-09 ${regions[0]}`),
    }));
  });

  it('should count a segment with an unexpected currency as failed without aborting the rest', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);
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
    expect(result).toEqual({ inserted: regions.length, skipped: 0, failed: 1 });
    expect(registerCost.execute).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: 'cost:2026-09:bot-infra',
    }));
  });

  it('should fetch region costs for the UTC month range', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);
    when(costProvider.fetchCost).calledWith(expect.anything()).thenResolve({ currency: 'USD', value: 10 });
    registerCost.execute.mockImplementation(async (params) => makeCostEntry(params.dedupeKey));

    // When
    await sut.execute({ month: 9, year: 2026 });

    // Then
    expect(costProvider.fetchCost).toHaveBeenCalledWith(expect.objectContaining({
      dateRange: {
        startDate: new Date(Date.UTC(2026, 8, 1)),
        endDate: new Date(Date.UTC(2026, 9, 0)),
      },
    }));
  });

  it('should reject the whole settlement when the exchange rate is unavailable', async () => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    exchangeRateProvider.getBrlPerUsd.mockRejectedValue(new Error('PTAX unavailable'));

    // When
    const attempt = sut.execute({ month: 9, year: 2026 });

    // Then
    await expect(attempt).rejects.toThrow('PTAX unavailable');
    expect(costProvider.fetchCost).not.toHaveBeenCalled();
    expect(registerCost.execute).not.toHaveBeenCalled();
  });

  it.each([{ month: 0 }, { month: 13 }])('should reject settlement month $month', async ({ month }) => {
    // Given
    const { sut, costProvider, exchangeRateProvider, registerCost } = makeSut();
    givenExchangeRate(exchangeRateProvider);

    // When
    const attempt = sut.execute({ month, year: 2026 });

    // Then
    await expect(attempt).rejects.toThrow();
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
    expect(costProvider.fetchCost).not.toHaveBeenCalled();
    expect(registerCost.execute).not.toHaveBeenCalled();
  });
});
