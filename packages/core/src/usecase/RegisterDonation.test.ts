import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { LedgerCurrency, LedgerTransaction } from '../domain/LedgerTransaction';
import { LedgerRepository } from '../repository/LedgerRepository';
import { ExchangeRateProvider } from '../services/ExchangeRateProvider';
import { RegisterDonation } from './RegisterDonation';

describe('RegisterDonation', () => {
  function makeSut() {
    const ledgerRepository = mock<LedgerRepository>();
    const exchangeRateProvider = mock<ExchangeRateProvider>();
    const sut = new RegisterDonation({ ledgerRepository, exchangeRateProvider });
    return { sut, ledgerRepository, exchangeRateProvider };
  }

  function makeStoredEntry(overrides: Partial<LedgerTransaction> = {}): LedgerTransaction {
    return {
      id: 1,
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
      type: 'DONATION',
      amountOriginal: 130,
      currencyOriginal: 'BRL',
      amountBrlCents: 13000,
      fxRate: 1,
      fxSource: 'NONE',
      source: 'Monthly support',
      actorDiscordId: '226828637586849795',
      dedupeKey: 'donation:seed',
      createdAt: new Date('2026-10-06T12:00:01.000Z'),
      ...overrides,
    };
  }

  it('should insert a BRL donation without calling the FX provider', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    const stored = makeStoredEntry();
    when(ledgerRepository.existsByDedupeKey).calledWith(expect.anything()).thenResolve(false);
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(stored);

    // When
    const result = await sut.execute({
      amount: 130,
      currency: 'BRL',
      source: 'Monthly support',
      actorDiscordId: '226828637586849795',
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
    });

    // Then
    expect(result).toEqual(stored);
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
    const inserted = ledgerRepository.insert.mock.calls[0][0].entry;
    expect(inserted.amountBrlCents).toBe(13000);
    expect(inserted.fxRate).toBe(1);
    expect(inserted.fxSource).toBe('NONE');
    expect(inserted.type).toBe('DONATION');
  });

  it('should convert a USD donation via the FX provider', async () => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    const occurredAt = new Date('2026-10-06T12:00:00.000Z');
    when(ledgerRepository.existsByDedupeKey).calledWith(expect.anything()).thenResolve(false);
    when(exchangeRateProvider.getBrlPerUsd)
      .calledWith({ date: occurredAt })
      .thenResolve({ rate: 5.5, source: 'PTAX', quotedAt: occurredAt });
    const stored = makeStoredEntry({ currencyOriginal: 'USD', amountOriginal: 10, amountBrlCents: 5500, fxRate: 5.5, fxSource: 'PTAX' });
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(stored);

    // When
    const result = await sut.execute({
      amount: 10,
      currency: 'USD',
      source: 'Patreon payout',
      actorDiscordId: '226828637586849795',
      occurredAt,
    });

    // Then
    expect(result.amountBrlCents).toBe(5500);
    const inserted = ledgerRepository.insert.mock.calls[0][0].entry;
    expect(inserted.fxRate).toBe(5.5);
    expect(inserted.fxSource).toBe('PTAX');
  });

  it('should build a stable dedupe key without the occurrence timestamp', async () => {
    // Given
    const { sut, ledgerRepository } = makeSut();
    when(ledgerRepository.existsByDedupeKey).calledWith(expect.anything()).thenResolve(false);
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(makeStoredEntry());

    // When
    await sut.execute({
      amount: 130,
      currency: 'BRL',
      source: '  Monthly support  ',
      actorDiscordId: '226828637586849795',
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
    });
    await sut.execute({
      amount: 130,
      currency: 'BRL',
      source: 'Monthly support',
      actorDiscordId: '226828637586849795',
      occurredAt: new Date('2026-12-24T23:15:00.000Z'),
    });

    // Then
    const [first, second] = ledgerRepository.insert.mock.calls.map(([call]) => call.entry);
    expect(first.dedupeKey).toBe('donation:226828637586849795:130:BRL:Monthly support');
    expect(second.dedupeKey).toBe(first.dedupeKey);
    expect(first.source).toBe('Monthly support');
  });

  it.each([
    { currency: 'BRL' as LedgerCurrency, amount: 130, message: 'A donation of 130 BRL from "Monthly support" is already registered.' },
    { currency: 'USD' as LedgerCurrency, amount: 10, message: 'A donation of 10 USD from "Monthly support" is already registered.' },
  ])('should reject an already registered $currency donation without calling the FX provider', async ({ currency, amount, message }) => {
    // Given
    const { sut, ledgerRepository, exchangeRateProvider } = makeSut();
    when(ledgerRepository.existsByDedupeKey).calledWith(expect.anything()).thenResolve(true);

    // When
    const attempt = sut.execute({
      amount,
      currency,
      source: 'Monthly support',
      actorDiscordId: '226828637586849795',
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
    });

    // Then
    await expect(attempt).rejects.toThrow(message);
    expect(ledgerRepository.existsByDedupeKey).toHaveBeenCalledWith({
      dedupeKey: `donation:226828637586849795:${amount}:${currency}:Monthly support`,
    });
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
    expect(exchangeRateProvider.getBrlPerUsd).not.toHaveBeenCalled();
  });

  it.each([
    { amount: 0, currency: 'BRL' as LedgerCurrency, source: 'Monthly support', actorDiscordId: '226828637586849795' },
    { amount: -5, currency: 'BRL' as LedgerCurrency, source: 'Monthly support', actorDiscordId: '226828637586849795' },
    { amount: Number.NaN, currency: 'BRL' as LedgerCurrency, source: 'Monthly support', actorDiscordId: '226828637586849795' },
    { amount: 10, currency: 'BRL' as LedgerCurrency, source: 'ab', actorDiscordId: '226828637586849795' },
    { amount: 10, currency: 'BRL' as LedgerCurrency, source: '   ', actorDiscordId: '226828637586849795' },
    { amount: 10, currency: 'BRL' as LedgerCurrency, source: 'Monthly support', actorDiscordId: '' },
    { amount: 10, currency: 'EUR' as unknown as LedgerCurrency, source: 'Monthly support', actorDiscordId: '226828637586849795' },
  ])('should reject invalid donation $amount $currency $source', async ({ amount, currency, source, actorDiscordId }) => {
    // Given
    const { sut, ledgerRepository } = makeSut();

    // When
    const attempt = sut.execute({ amount, currency, source, actorDiscordId });

    // Then
    await expect(attempt).rejects.toThrow();
    expect(ledgerRepository.existsByDedupeKey).not.toHaveBeenCalled();
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
  });
});
