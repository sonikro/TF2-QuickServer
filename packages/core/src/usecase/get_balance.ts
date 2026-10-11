import { LedgerRepository } from "../repository/ledger_repository";

type GetBalanceDependencies = {
  ledgerRepository: LedgerRepository;
};

type GetBalanceResult = {
  balanceBrlCents: number;
};

export class GetBalance {
  constructor(private readonly dependencies: GetBalanceDependencies) {}

  async execute(): Promise<GetBalanceResult> {
    const { ledgerRepository } = this.dependencies;
    const balanceBrlCents = await ledgerRepository.getBalance();
    return { balanceBrlCents };
  }
}
