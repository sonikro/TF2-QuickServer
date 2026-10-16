export type LedgerType = 'OPENING' | 'COST' | 'DONATION' | 'ADJUSTMENT';

export type LedgerCurrency = 'BRL' | 'USD';

export type LedgerFxSource = 'PTAX' | 'NONE';

export type LedgerTransaction = {
  id: number;
  occurredAt: Date;
  type: LedgerType;
  amountOriginal: number;
  currencyOriginal: LedgerCurrency;
  amountBrlCents: number;
  fxRate: number;
  fxSource: LedgerFxSource;
  source: string;
  actorDiscordId: string;
  dedupeKey: string;
  createdAt: Date;
};

export type NewLedgerEntry = {
  occurredAt: Date;
  type: LedgerType;
  amountOriginal: number;
  currencyOriginal: LedgerCurrency;
  amountBrlCents: number;
  fxRate: number;
  fxSource: LedgerFxSource;
  source: string;
  actorDiscordId: string;
  dedupeKey: string;
};

export function toBrlCents(params: { amount: number; fxRate: number }): number {
  const { amount, fxRate } = params;
  return Math.round(amount * fxRate * 100);
}

export function toMajorUnits(params: { amountInMinorUnits: number }): number {
  const { amountInMinorUnits } = params;
  return amountInMinorUnits / 100;
}

export function toBalanceBrl(params: { balanceBrlCents: number }): number {
  const { balanceBrlCents } = params;
  return toMajorUnits({ amountInMinorUnits: balanceBrlCents });
}

export function toDisplayBrl(params: { balanceBrlCents: number }): string {
  const { balanceBrlCents } = params;
  return (balanceBrlCents / 100).toFixed(2);
}

export function buildCostDedupeKey(params: { month: number; year: number; segment: string }): string {
  const { month, year, segment } = params;
  return `cost:${year}-${String(month).padStart(2, '0')}:${segment}`;
}

export function buildSettlementOccurredAt(params: { month: number; year: number }): Date {
  const { month, year } = params;
  return new Date(Date.UTC(year, month, 0, 12, 0, 0));
}
