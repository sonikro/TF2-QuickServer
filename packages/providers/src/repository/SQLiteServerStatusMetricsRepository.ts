import { Knex } from "knex";
import { ServerStatusMetric, ServerStatusMetricsRepository } from "@tf2qs/core";

type SQLiteServerStatusMetricsRepositoryDependencies = {
    knex: Knex;
};

export class SQLiteServerStatusMetricsRepository implements ServerStatusMetricsRepository {
    constructor(private readonly dependencies: SQLiteServerStatusMetricsRepositoryDependencies) {}

    async save(params: { metric: Omit<ServerStatusMetric, "id"> }): Promise<ServerStatusMetric> {
        const { metric } = params;
        const { knex } = this.dependencies;

        const [id] = await knex("server_status_metrics").insert({
            map: metric.map,
            timestamp: metric.timestamp,
        });

        return {
            id,
            map: metric.map,
            timestamp: metric.timestamp,
        };
    }
}
