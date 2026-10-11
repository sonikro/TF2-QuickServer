import { describe, expect, it } from 'vitest';
import { buildCostDedupeKey, buildSettlementOccurredAt, toBalanceBrl, toBrlCents, toDisplayBrl } from './ledger_transaction';

describe('ledger_transaction helpers', () => {
  it.each([
    { amount: 10, fxRate: 5.4321, expected: 5432 },
    { amount: 10, fxRate: 5.5, expected: 5500 },
    { amount: 130, fxRate: 1, expected: 13000 },
    { amount: 0.335, fxRate: 1, expected: 34 },
    { amount: 3, fxRate: 1.234, expected: 370 },
  ])('should convert $amount at rate $fxRate to $expected cents', ({ amount, fxRate, expected }) => {
    // Given
    const params = { amount, fxRate };

    // When
    const cents = toBrlCents(params);

    // Then
    expect(cents).toBe(expected);
  });

  it('should derive balance reais from cents', () => {
    // Given
    const params = { balanceBrlCents: 18500 };

    // When
    const balance = toBalanceBrl(params);

    // Then
    expect(balance).toBe(185);
  });

  it.each([
    { balanceBrlCents: 13000, expected: '130.00' },
    { balanceBrlCents: 18500, expected: '185.00' },
    { balanceBrlCents: -250, expected: '-2.50' },
    { balanceBrlCents: 0, expected: '0.00' },
  ])('should display $balanceBrlCents cents as $expected BRL', ({ balanceBrlCents, expected }) => {
    // When
    const display = toDisplayBrl({ balanceBrlCents });

    // Then
    expect(display).toBe(expected);
  });

  it('should build zero-padded monthly cost dedupe keys', () => {
    // When
    const key = buildCostDedupeKey({ month: 9, year: 2026, segment: 'sa-saopaulo-1' });

    // Then
    expect(key).toBe('cost:2026-09:sa-saopaulo-1');
  });

  it('should settle on the last day of the month at noon UTC', () => {
    // When
    const occurredAt = buildSettlementOccurredAt({ month: 9, year: 2026 });

    // Then
    expect(occurredAt.toISOString()).toBe('2026-09-30T12:00:00.000Z');
  });
});
