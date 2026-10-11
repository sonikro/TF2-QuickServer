import { describe, expect, it } from 'vitest';
import { BOT_INFRASTRUCTURE_COST_USD } from './ledger_constants';

describe('ledger_constants', () => {
  it('should keep the fixed monthly bot infrastructure cost', () => {
    // When
    const cost = BOT_INFRASTRUCTURE_COST_USD;

    // Then
    expect(cost).toBe(5.05);
  });
});
