import { MonthlyUsageReport } from "../domain/MonthlyUsageReport";
import { ReportRepository } from "../repository/ReportRepository";

type GenerateMonthlyUsageReportDependencies = {
  reportRepository: ReportRepository;
};

export class GenerateMonthlyUsageReport {
  constructor(private readonly dependencies: GenerateMonthlyUsageReportDependencies) {}

  async execute(): Promise<MonthlyUsageReport> {
    const { reportRepository } = this.dependencies;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

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
