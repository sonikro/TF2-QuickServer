import { Region, getCloudProvider } from '../../core/domain/Region';
import { CostProvider } from '../../core/services/CostProvider';
import { DateRange } from '../../core/domain/DateRange';
import { Cost } from '../../core/domain/Cost';
import { CloudProvider } from '../../core/domain/CloudProvider';

type DefaultCostProviderDependencies = {
  oracleCostProvider: CostProvider;
  awsCostProvider: CostProvider;
};

export class DefaultCostProvider implements CostProvider {
  constructor(private readonly dependencies: DefaultCostProviderDependencies) {}

  async fetchCost(params: { region: Region; dateRange: DateRange }): Promise<Cost> {
    const { oracleCostProvider, awsCostProvider } = this.dependencies;
    const cloudProvider = getCloudProvider(params.region);

    if (cloudProvider === CloudProvider.ORACLE) {
      return oracleCostProvider.fetchCost(params);
    }

    if (cloudProvider === CloudProvider.AWS) {
      return awsCostProvider.fetchCost(params);
    }

    throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
  }
}
