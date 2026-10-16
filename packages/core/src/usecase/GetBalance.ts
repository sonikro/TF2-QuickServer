import { LedgerRepository } from "../repository/LedgerRepository";

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
