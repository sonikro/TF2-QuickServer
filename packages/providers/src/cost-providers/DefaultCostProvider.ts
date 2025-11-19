import { Region, getCloudProvider } from '@tf2qs/core/src/domain/Region';
import { CostProvider } from '@tf2qs/core/src/services/CostProvider';
import { DateRange } from '@tf2qs/core/src/domain/DateRange';
import { Cost } from '@tf2qs/core/src/domain/Cost';
import { CloudProvider } from '@tf2qs/core/src/domain/CloudProvider';

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
