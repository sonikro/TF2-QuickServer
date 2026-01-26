import { ServerStatusMetric } from "../domain/ServerStatusMetric";

export interface ServerStatusMetricsRepository {
    save(params: { metric: Omit<ServerStatusMetric, "id"> }): Promise<ServerStatusMetric>;
}
