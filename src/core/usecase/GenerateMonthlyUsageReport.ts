import { MonthlyUsageReport } from "../domain/MonthlyUsageReport";
import { ReportRepository } from "../repository/ReportRepository";

type GenerateMonthlyUsageReportDependencies = {
  reportRepository: ReportRepository;
};

type GenerateMonthlyUsageReportExecuteParams = {
  date: Date;
};

export class GenerateMonthlyUsageReport {
  constructor(private readonly dependencies: GenerateMonthlyUsageReportDependencies) {}

  async execute(params: GenerateMonthlyUsageReportExecuteParams): Promise<MonthlyUsageReport> {
    const { reportRepository } = this.dependencies;
    const { date } = params;

    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const [
      topUsers,
      totalServersCreated,
      regionMetrics,
      averageServerDuration,
      totalTimePlayedMinutes,
      peakConcurrentServers,
      longestServerRun,
      uniqueUsersCount,
    ] = await Promise.all([
      reportRepository.getTopUsersByMinutesPlayed({ month, year, limit: 5 }),
      reportRepository.getTotalServersCreated({ month, year }),
      reportRepository.getServerMinutesByRegion({ month, year }),
      reportRepository.getAverageServerDuration({ month, year }),
      reportRepository.getTotalMinutesPlayed({ month, year }),
      reportRepository.getPeakConcurrentServers({ month, year }),
      reportRepository.getLongestServerRun({ month, year }),
      reportRepository.getUniqueUsersCount({ month, year }),
    ]);

    return {
      month,
      year,
      topUsers,
      totalServersCreated,
      regionMetrics,
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
