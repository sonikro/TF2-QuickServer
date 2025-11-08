import { Knex } from "knex";
import { LongestServerRun, PeakConcurrentServer, RegionMetrics, TopUserMetric } from "../../core/domain/MonthlyUsageReport";
import { ReportRepository } from "../../core/repository/ReportRepository";

export class SQLiteReportRepository implements ReportRepository {
  constructor(private readonly dependencies: { knex: Knex }) {}

  async getTopUsersByMinutesPlayed(
    params: { month: number; year: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<TopUserMetric[]> {
    const { month, year, limit } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .select(
        this.dependencies.knex.raw("createdBy AS userId"),
        this.dependencies.knex.raw(
          "SUM(((terminatedAt / 1000) - (createdAt / 1000)) / 60) AS totalTimePlayedMinutes"
        )
      )
      .where(this.dependencies.knex.raw("terminatedAt IS NOT NULL"))
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .groupBy("createdBy")
      .orderBy("totalTimePlayedMinutes", "desc")
      .limit(limit);

    if (trx) {
      query.transacting(trx);
    }

    const results = await query;
    return results.map((row: any) => ({
      userId: row.userId,
      totalTimePlayedMinutes: row.totalTimePlayedMinutes,
    }));
  }

  async getTotalServersCreated(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<number> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .count("* as total")
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .first();

    if (trx) {
      query.transacting(trx);
    }

    const result = await query;
    return Number(result?.total ?? 0);
  }

  async getServerMinutesByRegion(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<RegionMetrics[]> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .select(
        "region",
        this.dependencies.knex.raw(
          "SUM(((terminatedAt / 1000) - (createdAt / 1000)) / 60) AS timePlayedMinutes"
        )
      )
      .where(this.dependencies.knex.raw("terminatedAt IS NOT NULL"))
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .groupBy("region")
      .orderBy("timePlayedMinutes", "desc");

    if (trx) {
      query.transacting(trx);
    }

    const results = await query;
    return results.map((row: any) => ({
      region: row.region,
      timePlayedMinutes: row.timePlayedMinutes,
    }));
  }

  async getAverageServerDuration(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<number> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .select(
        this.dependencies.knex.raw(
          "AVG(((terminatedAt / 1000) - (createdAt / 1000)) / 60) AS avg_duration_minutes"
        )
      )
      .where(this.dependencies.knex.raw("terminatedAt IS NOT NULL"))
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .first();

    if (trx) {
      query.transacting(trx);
    }

    const result = await query;
    return result?.avg_duration_minutes ?? 0;
  }

  async getTotalMinutesPlayed(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<number> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .select(
        this.dependencies.knex.raw(
          "SUM(((terminatedAt / 1000) - (createdAt / 1000)) / 60) AS total_time_played_minutes"
        )
      )
      .where(this.dependencies.knex.raw("terminatedAt IS NOT NULL"))
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .first();

    if (trx) {
      query.transacting(trx);
    }

    const result = await query;
    return result?.total_time_played_minutes ?? 0;
  }

  async getPeakConcurrentServers(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<PeakConcurrentServer> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies.knex.raw(`
      WITH events AS (
        SELECT createdAt / 1000 AS event_time, 1 AS change
        FROM server_history
        WHERE strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?
          AND strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?
        UNION ALL
        SELECT terminatedAt / 1000 AS event_time, -1 AS change
        FROM server_history
        WHERE terminatedAt IS NOT NULL
          AND strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?
          AND strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?
      )
      SELECT event_time, MAX(running_servers) AS max_servers_running
      FROM (
        SELECT event_time, SUM(change) OVER (ORDER BY event_time) AS running_servers
        FROM events
        ORDER BY event_time
      )
      ORDER BY max_servers_running DESC
      LIMIT 1
    `, [monthStr, yearStr, monthStr, yearStr]);

    let result;
    if (trx) {
      result = await query.transacting(trx);
    } else {
      result = await query;
    }

    const row = Array.isArray(result) ? result[0] : result;

    return {
      eventTime: row?.event_time ?? 0,
      maxServersRunning: row?.max_servers_running ?? 0,
    };
  }

  async getLongestServerRun(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<LongestServerRun | null> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .select(
        "serverId",
        "createdBy",
        "createdAt",
        "terminatedAt",
        this.dependencies.knex.raw(
          "((terminatedAt / 1000) - (createdAt / 1000)) / 60 AS durationMinutes"
        )
      )
      .where(this.dependencies.knex.raw("terminatedAt IS NOT NULL"))
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .orderBy("durationMinutes", "desc")
      .first();

    if (trx) {
      query.transacting(trx);
    }

    const result = await query;
    if (!result) {
      return null;
    }

    return {
      serverId: result.serverId,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      terminatedAt: result.terminatedAt,
      durationMinutes: result.durationMinutes,
    };
  }

  async getUniqueUsersCount(
    params: { month: number; year: number },
    trx?: Knex.Transaction
  ): Promise<number> {
    const { month, year } = params;
    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year);

    const query = this.dependencies
      .knex("server_history")
      .countDistinct("createdBy as uniqueUsers")
      .where(this.dependencies.knex.raw(`strftime('%m', datetime(createdAt / 1000, 'unixepoch')) = ?`, [monthStr]))
      .where(this.dependencies.knex.raw(`strftime('%Y', datetime(createdAt / 1000, 'unixepoch')) = ?`, [yearStr]))
      .first();

    if (trx) {
      query.transacting(trx);
    }

    const result = await query;
    return Number(result?.uniqueUsers ?? 0);
  }
}
