import { LedgerCurrency, LedgerFxSource, LedgerTransaction, toBrlCents } from "../domain/ledger_transaction";
import { LedgerRepository } from "../repository/ledger_repository";
import { UserError } from "../errors/UserError";

type RegisterCostDependencies = {
  ledgerRepository: LedgerRepository;
};

type RegisterCostExecuteParams = {
  amount: number;
  currency: LedgerCurrency;
  source: string;
  dedupeKey: string;
  occurredAt: Date;
  fxRate: number;
  fxSource: LedgerFxSource;
};

export class RegisterCost {
  constructor(private readonly dependencies: RegisterCostDependencies) {}

  async execute(params: RegisterCostExecuteParams): Promise<LedgerTransaction | null> {
    const { ledgerRepository } = this.dependencies;
    const { amount, currency, source, dedupeKey, occurredAt, fxRate, fxSource } = params;

    validateCost({ amount, currency, source, dedupeKey, fxRate });

    const alreadySettled = await ledgerRepository.existsByDedupeKey({ dedupeKey });
    if (alreadySettled) {
      return null;
    }

    return ledgerRepository.insert({
      entry: {
        occurredAt,
        type: 'COST',
        amountOriginal: amount,
        currencyOriginal: currency,
        amountBrlCents: -toBrlCents({ amount, fxRate }),
        fxRate,
        fxSource,
        source,
        actorDiscordId: 'system',
        dedupeKey,
      },
    });
  }
}

type ValidateCostParams = {
  amount: number;
  currency: LedgerCurrency;
  source: string;
  dedupeKey: string;
  fxRate: number;
};

function validateCost(params: ValidateCostParams): void {
  const { amount, currency, source, dedupeKey, fxRate } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UserError('Cost amount must be greater than zero.');
  }
  if (currency !== 'BRL' && currency !== 'USD') {
    throw new UserError('Cost currency must be BRL or USD.');
  }
  if (source.trim().length === 0) {
    throw new UserError('Cost source is required.');
  }
  if (dedupeKey.trim().length === 0) {
    throw new UserError('Cost dedupe key is required.');
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    throw new UserError('Cost FX rate must be greater than zero.');
  }
}
