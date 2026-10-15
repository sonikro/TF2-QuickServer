import { describe, expect, it } from 'vitest';
import { getMoneyConfig, parseMoneyConfig } from './MoneyConfig';

describe('MoneyConfig', () => {
  describe('getMoneyConfig', () => {
    it('should read the fixed monthly infrastructure cost from the application config', () => {
      // When
      const moneyConfig = getMoneyConfig();

      // Then
      expect(moneyConfig).toEqual({
        fixedMonthlyInfrastructureCost: { amountInMinorUnits: 505, currency: 'USD' },
      });
      expect(Number.isInteger(moneyConfig.fixedMonthlyInfrastructureCost.amountInMinorUnits)).toBe(true);
    });
  });

  describe('parseMoneyConfig', () => {
    it.each([
      { amount: '5.05', currency: 'USD', expected: 505 },
      { amount: '5', currency: 'USD', expected: 500 },
      { amount: '9.99', currency: 'USD', expected: 999 },
      { amount: '1234.5', currency: 'USD', expected: 123450 },
      { amount: '0.01', currency: 'USD', expected: 1 },
      { amount: '0', currency: 'USD', expected: 0 },
      { amount: '5.05', currency: 'BRL', expected: 505 },
    ])('should parse amount $amount in $currency into $expected minor units', ({ amount, currency, expected }) => {
      // Given
      const source = { fixedMonthlyInfrastructureCost: { amount, currency } };

      // When
      const moneyConfig = parseMoneyConfig({ source });

      // Then
      expect(moneyConfig).toEqual({
        fixedMonthlyInfrastructureCost: { amountInMinorUnits: expected, currency },
      });
    });

    it.each([
      { amount: '5.055', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: 'abc', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '-1', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '5.', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '.5', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '1,50', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: ' ', currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: 505, currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: undefined, currency: 'USD', expectedMessage: 'expected a non-negative decimal string with at most two fraction digits' },
      { amount: '5.05', currency: 'EUR', expectedMessage: 'expected "BRL" or "USD"' },
      { amount: '5.05', currency: 'brl', expectedMessage: 'expected "BRL" or "USD"' },
      { amount: '5.05', currency: '', expectedMessage: 'expected "BRL" or "USD"' },
      { amount: '5.05', currency: undefined, expectedMessage: 'expected "BRL" or "USD"' },
      { amount: '5.05', currency: null, expectedMessage: 'expected "BRL" or "USD"' },
      { amount: '5.05', currency: 42, expectedMessage: 'expected "BRL" or "USD"' },
    ])('should reject the invalid money config amount $amount and currency $currency', ({ amount, currency, expectedMessage }) => {
      // Given
      const source = { fixedMonthlyInfrastructureCost: { amount, currency } };

      // When
      const attempt = () => parseMoneyConfig({ source });

      // Then
      expect(attempt).toThrow(expectedMessage);
    });

    it.each([
      { source: undefined },
      { source: {} },
    ])('should reject a missing money block', ({ source }) => {
      // When
      const attempt = () => parseMoneyConfig({ source });

      // Then
      expect(attempt).toThrow('The "money.fixedMonthlyInfrastructureCost" configuration block is required.');
    });
  });
});
