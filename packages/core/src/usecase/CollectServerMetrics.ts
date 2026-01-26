import { logger } from "@tf2qs/telemetry";
import { ServerStatusParser } from "../domain/ServerStatus";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerStatusMetricsRepository } from "../repository/ServerStatusMetricsRepository";
import { ServerCommander } from "../services/ServerCommander";

type CollectServerMetricsDependencies = {
    serverRepository: ServerRepository;
    serverStatusMetricsRepository: ServerStatusMetricsRepository;
    serverCommander: ServerCommander;
};

export class CollectServerMetrics {
    constructor(private readonly dependencies: CollectServerMetricsDependencies) {}

    async execute(): Promise<void> {
        const { serverRepository, serverStatusMetricsRepository, serverCommander } = this.dependencies;

        const servers = await serverRepository.getAllServers("ready");

        const timestamp = new Date();

        const results = await Promise.allSettled(
            servers.map(async (server) => {
                const statusOutput = await serverCommander.query({
                    command: "status",
                    host: server.rconAddress,
                    password: server.rconPassword,
                    port: 27015,
                    timeout: 5000,
                });

                const serverStatus = new ServerStatusParser(statusOutput);

                if (!serverStatus.map) {
                    logger.emit({
                        severityText: "WARN",
                        body: `Could not extract map from server ${server.serverId}`,
                        attributes: { serverId: server.serverId },
                    });
                    return;
                }

                await serverStatusMetricsRepository.save({
                    metric: {
                        serverId: server.serverId,
                        map: serverStatus.map,
                        timestamp,
                    },
                });
            })
        );

        for (const result of results) {
            if (result.status === "rejected") {
                logger.emit({
                    severityText: "WARN",
                    body: "Failed to collect metrics from a server",
                    attributes: { error: result.reason?.message ?? String(result.reason) },
                });
            }
        }
    }
}
