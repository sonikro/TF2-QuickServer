import { LedgerCurrency, LedgerTransaction, buildOpeningDedupeKey, toBrlCents } from "../domain/LedgerTransaction";
import { LedgerRepository } from "../repository/LedgerRepository";
import { ExchangeRateProvider } from "../services/ExchangeRateProvider";
import { UserError } from "../errors/UserError";

type SetLedgerOpeningDependencies = {
  ledgerRepository: LedgerRepository;
  exchangeRateProvider: ExchangeRateProvider;
};

type SetLedgerOpeningExecuteParams = {
  amount: number;
  currency: LedgerCurrency;
  actorDiscordId: string;
  occurredAt?: Date;
};

export class SetLedgerOpening {
  constructor(private readonly dependencies: SetLedgerOpeningDependencies) {}

  async execute(params: SetLedgerOpeningExecuteParams): Promise<LedgerTransaction> {
    const { ledgerRepository, exchangeRateProvider } = this.dependencies;
    const { amount, currency, actorDiscordId } = params;
    const occurredAt = params.occurredAt ?? new Date();

    validateOpening({ amount, currency, actorDiscordId });

    const alreadyOpened = await ledgerRepository.hasTransactions();
    if (alreadyOpened) {
      throw new UserError('The ledger already holds transactions; the opening balance can only be set once.');
    }

    const fxRate = currency === 'BRL'
      ? 1
      : (await exchangeRateProvider.getBrlPerUsd({ date: occurredAt })).rate;

    return ledgerRepository.insert({
      entry: {
        occurredAt,
        type: 'OPENING',
        amountOriginal: amount,
        currencyOriginal: currency,
        amountBrlCents: toBrlCents({ amount, fxRate }),
        fxRate,
        fxSource: currency === 'BRL' ? 'NONE' : 'PTAX',
        source: 'Opening balance from #money history',
        actorDiscordId,
        dedupeKey: buildOpeningDedupeKey(),
      },
    });
  }
}

type ValidateOpeningParams = {
  amount: number;
  currency: LedgerCurrency;
  actorDiscordId: string;
};

function validateOpening(params: ValidateOpeningParams): void {
  const { amount, currency, actorDiscordId } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UserError('Opening balance amount must be greater than zero.');
  }
  if (currency !== 'BRL' && currency !== 'USD') {
    throw new UserError('Opening balance currency must be BRL or USD.');
  }
  if (actorDiscordId.trim().length === 0) {
    throw new UserError('Opening balance actor is required.');
  }
}
