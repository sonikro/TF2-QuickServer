import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { LedgerCurrency, LedgerFxSource, LedgerTransaction } from '../domain/ledger_transaction';
import { LedgerRepository } from '../repository/ledger_repository';
import { RegisterCost } from './register_cost';

describe('RegisterCost', () => {
  function makeSut() {
    const ledgerRepository = mock<LedgerRepository>();
    const sut = new RegisterCost({ ledgerRepository });
    return { sut, ledgerRepository };
  }

  function makeParams() {
    return {
      amount: 5.05,
      currency: 'USD' as LedgerCurrency,
      source: 'Monthly infrastructure cost 2026-09 bot-infra',
      dedupeKey: 'cost:2026-09:bot-infra',
      occurredAt: new Date('2026-09-30T12:00:00.000Z'),
      fxRate: 5.5,
      fxSource: 'PTAX' as LedgerFxSource,
    };
  }

  function makeStoredEntry(): LedgerTransaction {
    return {
      id: 2,
      occurredAt: new Date('2026-09-30T12:00:00.000Z'),
      type: 'COST',
      amountOriginal: 5.05,
      currencyOriginal: 'USD',
      amountBrlCents: -2778,
      fxRate: 5.5,
      fxSource: 'PTAX',
      source: 'Monthly infrastructure cost 2026-09 bot-infra',
      actorDiscordId: 'system',
      dedupeKey: 'cost:2026-09:bot-infra',
      createdAt: new Date('2026-10-01T12:00:01.000Z'),
    };
  }

  it('should insert a negative-cent cost entry when the dedupe key is new', async () => {
    // Given
    const { sut, ledgerRepository } = makeSut();
    when(ledgerRepository.existsByDedupeKey).calledWith({ dedupeKey: 'cost:2026-09:bot-infra' }).thenResolve(false);
    when(ledgerRepository.insert).calledWith(expect.anything()).thenResolve(makeStoredEntry());

    // When
    const result = await sut.execute(makeParams());

    // Then
    expect(result?.amountBrlCents).toBe(-2778);
    expect(result?.actorDiscordId).toBe('system');
    expect(result?.type).toBe('COST');
  });

  it('should return null without inserting when the dedupe key already exists', async () => {
    // Given
    const { sut, ledgerRepository } = makeSut();
    when(ledgerRepository.existsByDedupeKey).calledWith({ dedupeKey: 'cost:2026-09:bot-infra' }).thenResolve(true);

    // When
    const result = await sut.execute(makeParams());

    // Then
    expect(result).toBeNull();
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
  });

  it.each([
    { amount: 0, dedupeKey: 'cost:2026-09:bot-infra', fxRate: 5.5, source: 'Monthly cost' },
    { amount: -3, dedupeKey: 'cost:2026-09:bot-infra', fxRate: 5.5, source: 'Monthly cost' },
    { amount: 5.05, dedupeKey: '', fxRate: 5.5, source: 'Monthly cost' },
    { amount: 5.05, dedupeKey: 'cost:2026-09:bot-infra', fxRate: 0, source: 'Monthly cost' },
    { amount: 5.05, dedupeKey: 'cost:2026-09:bot-infra', fxRate: 5.5, source: '  ' },
  ])('should reject invalid cost $amount $dedupeKey', async ({ amount, dedupeKey, fxRate, source }) => {
    // Given
    const { sut, ledgerRepository } = makeSut();

    // When
    const attempt = sut.execute({ ...makeParams(), amount, dedupeKey, fxRate, source });

    // Then
    await expect(attempt).rejects.toThrow();
    expect(ledgerRepository.insert).not.toHaveBeenCalled();
  });
});
