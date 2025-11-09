import { MonthlyUsageReport } from "../domain/MonthlyUsageReport";
import { getRegions } from "../domain/Region";
import { ReportRepository } from "../repository/ReportRepository";
import { CostProvider } from "../services/CostProvider";

type GenerateMonthlyUsageReportDependencies = {
  reportRepository: ReportRepository;
  costProvider: CostProvider;
};

type GenerateMonthlyUsageReportExecuteParams = {
  date: Date;
};

export class GenerateMonthlyUsageReport {
  constructor(private readonly dependencies: GenerateMonthlyUsageReportDependencies) {}

  async execute(params: GenerateMonthlyUsageReportExecuteParams): Promise<MonthlyUsageReport> {
    const { reportRepository, costProvider } = this.dependencies;
    const { date } = params;

    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const allRegions = getRegions();

    const dateRange = {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0),
    };

    const costPromises = allRegions.map(region =>
      costProvider.fetchCost({ region, dateRange }).then(cost => ({
        region,
        cost: cost.value,
        currency: cost.currency,
      }))
    );

    const [
      topUsers,
      totalServersCreated,
      regionMetrics,
      averageServerDuration,
      totalTimePlayedMinutes,
      peakConcurrentServers,
      longestServerRun,
      uniqueUsersCount,
      ...regionCosts
    ] = await Promise.all([
      reportRepository.getTopUsersByMinutesPlayed({ month, year, limit: 5 }),
      reportRepository.getTotalServersCreated({ month, year }),
      reportRepository.getServerMinutesByRegion({ month, year }),
      reportRepository.getAverageServerDuration({ month, year }),
      reportRepository.getTotalMinutesPlayed({ month, year }),
      reportRepository.getPeakConcurrentServers({ month, year }),
      reportRepository.getLongestServerRun({ month, year }),
      reportRepository.getUniqueUsersCount({ month, year }),
      ...costPromises,
    ]);

    return {
      month,
      year,
      topUsers,
      totalServersCreated,
      regionMetrics,
      regionCosts,
      averageServerDurationMinutes: averageServerDuration,
      totalTimePlayedMinutes,
      peakConcurrentServers,
      longestServerRun: longestServerRun || {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount,
    };
  }
}
