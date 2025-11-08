export type TopUserMetric = {
  userId: string;
  totalTimePlayedMinutes: number;
};

export type RegionMetrics = {
  region: string;
  timePlayedMinutes: number;
};

export type LongestServerRun = {
  serverId: string;
  createdBy: string;
  createdAt: number;
  terminatedAt: number;
  durationMinutes: number;
};

export type PeakConcurrentServer = {
  eventTime: number;
  maxServersRunning: number;
};

export type MonthlyUsageReport = {
  month: number;
  year: number;
  topUsers: TopUserMetric[];
  totalServersCreated: number;
  regionMetrics: RegionMetrics[];
  averageServerDurationMinutes: number;
  totalTimePlayedMinutes: number;
  peakConcurrentServers: PeakConcurrentServer;
  longestServerRun: LongestServerRun;
  uniqueUsersCount: number;
};
