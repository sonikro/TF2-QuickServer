import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { Cost } from '@tf2qs/core/src/domain/Cost';
import { DateRange } from '@tf2qs/core/src/domain/DateRange';
import { Region } from '@tf2qs/core/src/domain/Region';
import { CostProvider } from '@tf2qs/core/src/services/CostProvider';
import { logger } from '@tf2qs/telemetry/src/otel';
import { AWSClientFactory } from '../../services/defaultAWSServiceFactory';

type AWSCostProviderDependencies = {
  clientFactory: AWSClientFactory;
};

export class AWSCostProvider implements CostProvider {
  constructor(private readonly dependencies: AWSCostProviderDependencies) {}

  async fetchCost(params: { region: Region; dateRange: DateRange }): Promise<Cost> {
    const { region, dateRange } = params;
    const { clientFactory } = this.dependencies;

    try {
      const ceClient = clientFactory('us-east-1').ceClient;
      const startDate = this.formatDateForAWS(dateRange.startDate);
      const endDate = this.formatDateForAWS(this.getNextDay(dateRange.endDate));

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['NetUnblendedCost'],
        GroupBy: [{
          Key: 'REGION',
          Type: 'DIMENSION',
        }],
        Filter: {
          Dimensions: {
            Key: 'REGION',
            Values: [region],
          },
        },
      });

      const response = await ceClient.send(command);
      const totalCost = this.calculateTotalCostFromGroupBy(response.ResultsByTime);
      const currency = 'USD';

      logger.emit({
        severityText: 'INFO',
        body: 'Successfully fetched cost data from AWS',
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
        body: `Failed to fetch cost data from AWS for region ${region}`,
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

  private formatDateForAWS(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getNextDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }

  private calculateTotalCostFromGroupBy(
    resultsByTime: Array<{
      Total?: Record<string, { Amount?: string; Unit?: string }>;
      Groups?: Array<{ Metrics?: Record<string, { Amount?: string; Unit?: string }> }>;
    }> | undefined
  ): number {
    if (!resultsByTime) {
      return 0;
    }

    let totalCost = 0;

    for (const result of resultsByTime) {
      if (result.Groups) {
        for (const group of result.Groups) {
          if (group.Metrics?.NetUnblendedCost?.Amount) {
            totalCost += parseFloat(group.Metrics.NetUnblendedCost.Amount);
          }
        }
      } else if (result.Total?.NetUnblendedCost?.Amount) {
        totalCost += parseFloat(result.Total.NetUnblendedCost.Amount);
      }
    }

    return totalCost;
  }
}
