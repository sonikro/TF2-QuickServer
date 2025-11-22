import { Region } from '@tf2qs/core';
import { CostProvider } from '@tf2qs/core';
import { DateRange } from '@tf2qs/core';
import { Cost } from '@tf2qs/core';
import { logger } from '@tf2qs/telemetry';
import { ConfigManager } from '@tf2qs/core';
import { UsageapiClient, models, requests } from 'oci-usageapi';

type OracleCostProviderDependencies = {
  ociClientFactory: (region: Region) => { usageClient: UsageapiClient };
  configManager: ConfigManager;
};

export class OracleCostProvider implements CostProvider {
  constructor(private readonly dependencies: OracleCostProviderDependencies) {}

  async fetchCost(params: { region: Region; dateRange: DateRange }): Promise<Cost> {
    const { region, dateRange } = params;
    const { ociClientFactory, configManager } = this.dependencies;

    try {
      const { usageClient } = ociClientFactory(region);
      const oracleConfig = configManager.getOracleConfig();
      const oracleRegionConfig = oracleConfig.regions[region];
      
      if (!oracleRegionConfig) {
        throw new Error(`Region ${region} is not configured in Oracle config`);
      }

      const tenantId = oracleRegionConfig.compartment_id;

      const requestDetails: models.RequestSummarizedUsagesDetails = {
        tenantId,
        timeUsageStarted: dateRange.startDate,
        timeUsageEnded: dateRange.endDate,
        granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
        queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
        groupBy: ['region'],
      };

      const request: requests.RequestSummarizedUsagesRequest = {
        requestSummarizedUsagesDetails: requestDetails,
      };

      const response = await usageClient.requestSummarizedUsages(request);
      const usageSummaries = response.usageAggregation.items;
      const regionSpecificSummaries = usageSummaries.filter(summary => summary.region === region);
      const { totalCost, currency } = this.calculateTotalCostAndCurrency(regionSpecificSummaries);

      logger.emit({
        severityText: 'INFO',
        body: 'Successfully fetched cost data from Oracle Cloud',
        attributes: {
          region,
          totalCost,
          currency,
          dateRangeStart: dateRange.startDate.toISOString(),
          dateRangeEnd: dateRange.endDate.toISOString(),
        },
      });

      return {
        currency,
        value: totalCost,
      };
    } catch (error) {
      logger.emit({
        severityText: 'ERROR',
        body: `Failed to fetch cost data from Oracle Cloud for region ${region}`,
        attributes: {
          region,
          error: error instanceof Error ? error.message : String(error),
          dateRangeStart: dateRange.startDate.toISOString(),
          dateRangeEnd: dateRange.endDate.toISOString(),
        },
      });

      throw error;
    }
  }

  private calculateTotalCostAndCurrency(usageSummaries: models.UsageSummary[]): { totalCost: number; currency: string } {
    let totalCost = 0;
    let currency = 'USD';

    for (const summary of usageSummaries) {
      totalCost += summary.computedAmount || 0;
      if (summary.currency?.trim()) {
        currency = summary.currency!;
      }
    }

    return { totalCost, currency };
  }
}
