import config from "config";
import { LedgerCurrency } from "./LedgerTransaction";

export type MoneyConfig = {
  fixedMonthlyInfrastructureCost: {
    amountInMinorUnits: number;
    currency: LedgerCurrency;
  };
};

type MoneyConfigSource = {
  fixedMonthlyInfrastructureCost?: {
    amount?: unknown;
    currency?: unknown;
  };
};

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

type ParseMoneyConfigParams = {
  source: MoneyConfigSource | undefined;
};

export function parseMoneyConfig(params: ParseMoneyConfigParams): MoneyConfig {
  const { source } = params;
  const fixedMonthlyInfrastructureCost = source?.fixedMonthlyInfrastructureCost;
  if (!fixedMonthlyInfrastructureCost) {
    throw new Error('The "money.fixedMonthlyInfrastructureCost" configuration block is required.');
  }

  const { amount, currency } = fixedMonthlyInfrastructureCost;
  if (typeof amount !== "string" || !AMOUNT_PATTERN.test(amount)) {
    throw new Error(`Invalid fixed monthly infrastructure cost amount ${JSON.stringify(amount)}: expected a non-negative decimal string with at most two fraction digits.`);
  }

  const amountInMinorUnits = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountInMinorUnits)) {
    throw new Error(`Invalid fixed monthly infrastructure cost amount ${JSON.stringify(amount)}: expected minor units within the safe integer range.`);
  }

  if (!isLedgerCurrency(currency)) {
    throw new Error(`Invalid fixed monthly infrastructure cost currency ${JSON.stringify(currency)}: expected "BRL" or "USD".`);
  }

  return {
    fixedMonthlyInfrastructureCost: {
      amountInMinorUnits,
      currency,
    },
  };
}

function isLedgerCurrency(value: unknown): value is LedgerCurrency {
  return value === "BRL" || value === "USD";
}

export function getMoneyConfig(): MoneyConfig {
  return parseMoneyConfig({ source: config.has("money") ? config.get<MoneyConfigSource>("money") : undefined });
}
