import { LedgerCurrency, LedgerTransaction, toBrlCents } from "../domain/LedgerTransaction";
import { LedgerRepository } from "../repository/LedgerRepository";
import { ExchangeRateProvider } from "../services/ExchangeRateProvider";
import { UserError } from "../errors/UserError";

type RegisterDonationDependencies = {
  ledgerRepository: LedgerRepository;
  exchangeRateProvider: ExchangeRateProvider;
};

type RegisterDonationExecuteParams = {
  amount: number;
  currency: LedgerCurrency;
  source: string;
  actorDiscordId: string;
  occurredAt?: Date;
};

export class RegisterDonation {
  constructor(private readonly dependencies: RegisterDonationDependencies) {}

  async execute(params: RegisterDonationExecuteParams): Promise<LedgerTransaction> {
    const { ledgerRepository, exchangeRateProvider } = this.dependencies;
    const { amount, currency, source, actorDiscordId } = params;
    const occurredAt = params.occurredAt ?? new Date();

    validateDonation({ amount, currency, source, actorDiscordId });

    const normalizedSource = source.trim();
    const fxRate = currency === 'BRL'
      ? 1
      : (await exchangeRateProvider.getBrlPerUsd({ date: occurredAt })).rate;

    return ledgerRepository.insert({
      entry: {
        occurredAt,
        type: 'DONATION',
        amountOriginal: amount,
        currencyOriginal: currency,
        amountBrlCents: toBrlCents({ amount, fxRate }),
        fxRate,
        fxSource: currency === 'BRL' ? 'NONE' : 'PTAX',
        source: normalizedSource,
        actorDiscordId,
        dedupeKey: buildDonationDedupeKey({ occurredAt, actorDiscordId, amount, currency, source: normalizedSource }),
      },
    });
  }
}

type ValidateDonationParams = {
  amount: number;
  currency: LedgerCurrency;
  source: string;
  actorDiscordId: string;
};

function validateDonation(params: ValidateDonationParams): void {
  const { amount, currency, source, actorDiscordId } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UserError('Donation amount must be greater than zero.');
  }
  if (currency !== 'BRL' && currency !== 'USD') {
    throw new UserError('Donation currency must be BRL or USD.');
  }
  if (source.trim().length < 3 || source.trim().length > 120) {
    throw new UserError('Donation source must be between 3 and 120 characters.');
  }
  if (actorDiscordId.trim().length === 0) {
    throw new UserError('Donation actor is required.');
  }
}

type BuildDonationDedupeKeyParams = {
  occurredAt: Date;
  actorDiscordId: string;
  amount: number;
  currency: LedgerCurrency;
  source: string;
};

function buildDonationDedupeKey(params: BuildDonationDedupeKeyParams): string {
  const { occurredAt, actorDiscordId, amount, currency, source } = params;
  return `donation:${occurredAt.toISOString()}:${actorDiscordId}:${amount}:${currency}:${source}`;
}
