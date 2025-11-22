import { Knex } from "knex";
import { LongestServerRun, PeakConcurrentServer, RegionMetrics, TopUserMetric } from "../domain/MonthlyUsageReport";

export interface ReportRepository {
  getTopUsersByMinutesPlayed(params: { month: number; year: number; limit: number }, trx?: Knex.Transaction): Promise<TopUserMetric[]>;
  
  getTotalServersCreated(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<number>;
  
  getServerMinutesByRegion(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<RegionMetrics[]>;
  
  getAverageServerDuration(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<number>;
  
  getTotalMinutesPlayed(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<number>;
  
  getPeakConcurrentServers(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<PeakConcurrentServer>;
  
  getLongestServerRun(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<LongestServerRun | null>;
  
  getUniqueUsersCount(params: { month: number; year: number }, trx?: Knex.Transaction): Promise<number>;
}
