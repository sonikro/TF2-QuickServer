import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { LedgerCurrency, LedgerTransaction } from '../domain/LedgerTransaction';
import { LedgerRepository } from '../repository/LedgerRepository';
import { ExchangeRateProvider } from '../services/ExchangeRateProvider';
import { SetLedgerOpening } from './SetLedgerOpening';

const ACTOR_DISCORD_ID = '226828637586849795';
const OCCURRED_AT = new Date('2026-10-06T12:00:00.000Z');

describe('SetLedgerOpening', () => {
  function makeSut() {
    const ledgerRepository = mock<LedgerRepository>();
    const exchangeRateProvider = mock<ExchangeRateProvider>();
    const sut = new SetLedgerOpening({ ledgerRepository, exchangeRateProvider });
    return { sut, ledgerRepository, exchangeRateProvider };
  }

  function makeStoredEntry(overrides: Partial<LedgerTransaction> = {}): LedgerTransaction {
    return {
      id: 1,
      occurredAt: OCCURRED_AT,
      type: 'OPENING',
      amountOriginal: 130,
      currencyOriginal: 'BRL',
      amountBrlCents: 13000,
      fxRate: 1,
      fxSource: 'NONE',
      source: 'Opening balance from #money history',
      actorDiscordId: ACTOR_DISCORD_ID,
      dedupeKey: 'opening:ledger',
      createdAt: new Date('2026-10-06T12:00:01.000Z'),
      ...overrides,
    };
  }

  it('should record a BRL opening balance without calling the FX provider', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    const stored = makeStoredEntry();
    when(ledgerRepository.hasTransactions).calledWith().thenResolve(false);
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(stored);

    // When
    const result = await sut.execute({ amount: 130, currency: 'BRL', actorDiscordId: ACTOR_DISCORD_ID, occurredAt: OCCURRED_AT });

    // Then
    expect(result).toEqual(stored);
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
    const inserted = ledgerRepository.insert.mock.calls[0][0].entry;
    expect(inserted.type).toBe('OPENING');
    expect(inserted.source).toBe('Opening balance from #money history');
    expect(inserted.amountBrlCents).toBe(13000);
    expect(inserted.fxRate).toBe(1);
    expect(inserted.fxSource).toBe('NONE');
    expect(inserted.actorDiscordId).toBe(ACTOR_DISCORD_ID);
    expect(inserted.dedupeKey).toBe('opening:ledger');
  });

  it('should record a USD opening balance at the PTAX rate', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    when(ledgerRepository.hasTransactions).calledWith().thenResolve(false);
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: OCCURRED_AT })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: OCCURRED_AT });
    const stored = makeStoredEntry({ currencyOriginal: 'USD', amountOriginal: 10, amountBrlCents: 5500, fxRate: 5.5, fxSource: 'PTAX' });
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(stored);

    // When
    const result = await sut.execute({ amount: 10, currency: 'USD', actorDiscordId: ACTOR_DISCORD_ID, occurredAt: OCCURRED_AT });

    // Then
    expect(result.amountBrlCents).toBe(5500);
    const inserted = ledgerRepository.insert.mock.calls[0][0].entry;
    expect(inserted.currencyOriginal).toBe('USD');
    expect(inserted.fxRate).toBe(5.5);
    expect(inserted.fxSource).toBe('PTAX');
  });

  it('should use the same stable dedupe key for every invocation', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    when(ledgerRepository.hasTransactions).calledWith().thenResolve(false);
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(makeStoredEntry());
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: new Date('2026-12-24T23:15:00.000Z') })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: new Date('2026-12-24T23:15:00.000Z') });

    // When
    await sut.execute({ amount: 130, currency: 'BRL', actorDiscordId: ACTOR_DISCORD_ID, occurredAt: OCCURRED_AT });
    await sut.execute({ amount: 250, currency: 'USD', actorDiscordId: '999999999999999999', occurredAt: new Date('2026-12-24T23:15:00.000Z') });

    // Then
    const [first, second] = ledgerRepository.insert.mock.calls.map(([call]) => call.entry);
    expect(first.dedupeKey).toBe('opening:ledger');
    expect(second.dedupeKey).toBe(first.dedupeKey);
  });

  it('should refuse to set the opening balance when the ledger already holds transactions', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    when(ledgerRepository.hasTransactions).calledWith().thenResolve(true);

    // When
    const attempt = sut.execute({ amount: 130, currency: 'USD', actorDiscordId: ACTOR_DISCORD_ID, occurredAt: OCCURRED_AT });

    // Then
    await expect(attempt).rejects.toThrow('The ledger already holds transactions; the opening balance can only be set once.');
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
  });

  it.each([
    { amount: 0, currency: 'BRL' as LedgerCurrency, actorDiscordId: ACTOR_DISCORD_ID },
    { amount: -5, currency: 'BRL' as LedgerCurrency, actorDiscordId: ACTOR_DISCORD_ID },
    { amount: Number.NaN, currency: 'BRL' as LedgerCurrency, actorDiscordId: ACTOR_DISCORD_ID },
    { amount: 130, currency: 'EUR' as unknown as LedgerCurrency, actorDiscordId: ACTOR_DISCORD_ID },
    { amount: 130, currency: 'BRL' as LedgerCurrency, actorDiscordId: '' },
    { amount: 130, currency: 'BRL' as LedgerCurrency, actorDiscordId: '   ' },
  ])('should reject an invalid opening balance $amount $currency $actorDiscordId', async ({ amount, currency, actorDiscordId }) => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();

    // When
    const attempt = sut.execute({ amount, currency, actorDiscordId, occurredAt: OCCURRED_AT });

    // Then
    await expect(attempt).rejects.toThrow();
    expect(ledgerRepository.hasTransactions).not.toHaveBeenCalled();
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
  });
});
