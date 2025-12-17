import { logger } from '@tf2qs/telemetry';
import { Server } from '../domain/DeployedServer';
import { ServerStatusParser } from '../domain/ServerStatus';
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerCommander } from "../services/ServerCommander";
import { BackgroundTaskQueue } from "../services/BackgroundTaskQueue";
import { ConfigManager } from "../utils/ConfigManager";

export class TerminateEmptyServers {

    constructor(private readonly dependencies: {
        serverRepository: ServerRepository
        serverActivityRepository: ServerActivityRepository,
        serverCommander: ServerCommander,
        eventLogger: EventLogger,
        configManager: ConfigManager,
        backgroundTaskQueue: BackgroundTaskQueue
    }) { }

    /**
     * Terminates servers that have been empty for a specified duration.
     * @param args - The arguments for the command.
     * @param args.minutesEmpty - The duration in minutes after which servers should be terminated.
     */
    public async execute(): Promise<void> {
        const { serverRepository, serverActivityRepository, serverCommander, eventLogger, configManager, backgroundTaskQueue } = this.dependencies;

        const { servers, serverActivities } = await serverRepository.runInTransaction(async (trx) => {
            const servers = await serverRepository.getAllServers("ready", trx);
            const serverActivities = await serverActivityRepository.getAll(trx);
            return { servers, serverActivities };
        });

        const mergedServers = servers.map((server) => {
            const serverActivity = serverActivities.find((activity) => activity.serverId === server.serverId);
            return {
                ...server,
                ...serverActivity,
            };
        });

        const variantConfigMap = new Map<string, number>();
        for (const server of mergedServers) {
            if (!variantConfigMap.has(server.variant)) {
                try {
                    const variantConfig = await configManager.getVariantConfig({ 
                        variant: server.variant, 
                        guildId: server.guildId 
                    });
                    variantConfigMap.set(server.variant, variantConfig?.emptyMinutesTerminate ?? 10);
                } catch (error) {
                    variantConfigMap.set(server.variant, 10);
                }
            }
        }

        const serversToDelete = mergedServers.filter((server) => {
            if (!server.emptySince) {
                return false;
            }
            const minutesEmpty = variantConfigMap.get(server.variant) ?? 10;
            const emptyDuration = new Date().getTime() - server.emptySince.getTime();
            return emptyDuration >= minutesEmpty * 60 * 1000;
        });

        for (const server of serversToDelete) {
            const minutesEmpty = variantConfigMap.get(server.variant) ?? 10;

            logger.emit({
                severityText: 'INFO',
                body: `Terminating server ${server.serverId} due to inactivity for ${minutesEmpty} minutes.`,
                attributes: { serverId: server.serverId }
            });

            await backgroundTaskQueue.enqueue('delete-server', { serverId: server.serverId }, {
                onError: async (error) => {
                    logger.emit({
                        severityText: 'ERROR',
                        body: `Failed to delete server ${server.serverId}: ${error.message}`,
                        attributes: { serverId: server.serverId, error: error.message }
                    });
                }
            }, {
                maxRetries: 10,
                initialDelayMs: 60000,
                maxDelayMs: 600000,
                backoffMultiplier: 2,
            });

            const index = mergedServers.findIndex((s) => s.serverId === server.serverId);
            if (index !== -1) {
                mergedServers.splice(index, 1);
            }
        }

        const statusResults = await Promise.allSettled(
            mergedServers.map(async (server) => {
                try {
                    const statusOutput = await serverCommander.query({
                        command: "status",
                        host: server.rconAddress,
                        password: server.rconPassword,
                        port: 27015,
                        timeout: 5000,
                    });
                    const serverStatus = new ServerStatusParser(statusOutput);
                    if (serverStatus.numberOfPlayers === 0 && server.emptySince === null) {
                        logger.emit({
                            severityText: 'INFO',
                            body: `Server ${server.serverId} is empty.`,
                            attributes: { serverId: server.serverId }
                        });
                        server.emptySince = new Date();
                    }

                    if ((serverStatus.numberOfPlayers ?? 0) > 0) {
                        logger.emit({
                            severityText: 'INFO',
                            body: `Server ${server.serverId} is not empty.`,
                            attributes: { serverId: server.serverId }
                        });
                        server.emptySince = null;
                    }
                } catch (error) {
                    logger.emit({
                        severityText: 'WARN',
                        body: `Error fetching status for server ${server.serverId}:`,
                        attributes: {
                            serverId: server.serverId,
                            error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                        }
                    });
                    if (server.emptySince === null) {
                        server.emptySince = new Date();
                    }
                }

                server.lastCheckedAt = new Date();

                try {
                    await serverRepository.runInTransaction(async (trx) => {
                        const existingServer = await serverRepository.findById(server.serverId, trx);
                        if (!existingServer) {
                            logger.emit({
                                severityText: 'INFO',
                                body: `Server ${server.serverId} no longer exists, skipping activity update.`,
                                attributes: { serverId: server.serverId }
                            });
                            return;
                        }

                        await serverActivityRepository.upsert({
                            serverId: server.serverId,
                            emptySince: server.emptySince!,
                            lastCheckedAt: server.lastCheckedAt!,
                        }, trx);
                    });
                } catch (error) {
                    logger.emit({
                        severityText: 'ERROR',
                        body: `Failed to update activity for server ${server.serverId}:`,
                        attributes: {
                            serverId: server.serverId,
                            error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                        }
                    });
                }
            })
        );

        const statusErrors = statusResults.filter(r => r.status === 'rejected');
        if (statusErrors.length > 0) {
            throw new Error(`One or more server status updates failed: ${statusErrors.map(e => (e as PromiseRejectedResult).reason).join('; ')}`);
        }
    }
}