import { Client as DiscordClient } from "discord.js";
import { logger } from '../../telemetry/otel';
import { ServerStatus } from "../domain/ServerStatus";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManager } from "../services/ServerManager";
import { ConfigManager } from "../utils/ConfigManager";

export class TerminateEmptyServers {

    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository
        serverActivityRepository: ServerActivityRepository,
        serverCommander: ServerCommander,
        eventLogger: EventLogger,
        configManager: ConfigManager,
        discordBot: DiscordClient
    }) { }

    /**
     * Terminates servers that have been empty for a specified duration.
     * @param args - The arguments for the command.
     * @param args.minutesEmpty - The duration in minutes after which servers should be terminated.
     */
    public async execute(): Promise<void> {
        const { serverManager, serverRepository, serverActivityRepository, serverCommander, eventLogger, configManager, discordBot } = this.dependencies;

        // Use transaction to ensure consistency for fetching data
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
        })

        // Delete servers that have been empty for the specified duration (in parallel, allSettled)
        await Promise.allSettled(
            mergedServers.map(async (server) => {
                if (server.emptySince) {
                    const variantConfig = configManager.getVariantConfig(server.variant);
                    const minutesEmpty = variantConfig?.emptyMinutesTerminate ?? 10; // Default to 10 minutes if not specified
                    const emptyDuration = new Date().getTime() - server.emptySince.getTime();
                    if (emptyDuration >= minutesEmpty * 60 * 1000) {
                        logger.emit({ severityText: 'INFO', body: `Terminating server ${server.serverId} due to inactivity for ${minutesEmpty} minutes.`, attributes: { serverId: server.serverId } });
                        // Terminate the server
                        try {
                            // Use transaction to ensure atomicity of deletion
                            await serverRepository.runInTransaction(async (trx) => {
                                // Check if server still exists before deleting
                                const existingServer = await serverRepository.findById(server.serverId, trx);
                                if (!existingServer) {
                                    logger.emit({ severityText: 'INFO', body: `Server ${server.serverId} was already deleted, skipping.`, attributes: { serverId: server.serverId } });
                                    return;
                                }

                                await serverManager.deleteServer({
                                    region: server.region,
                                    serverId: server.serverId,
                                });
                                // Delete the server from the repository
                                await serverRepository.deleteServer(server.serverId, trx);
                                // Delete server activity to prevent orphaned records
                                await serverActivityRepository.deleteById(server.serverId, trx);
                            });

                            // Remove the server from the mergedServers array
                            const index = mergedServers.findIndex((s) => s.serverId === server.serverId);
                            if (index !== -1) {
                                mergedServers.splice(index, 1);
                            }

                            // Log the event
                            await eventLogger.log({
                                eventMessage: `Server ${server.serverId} terminated due to inactivity for ${minutesEmpty} minutes.`,
                                actorId: server.createdBy!,
                            });

                            try {
                                const user = await discordBot.users.fetch(server.createdBy!)
                                if (user) {
                                    await user.send(`Your server ${server.serverId} has been terminated due to inactivity for ${minutesEmpty} minutes.`);
                                }
                            } catch (error) {
                                // Ignore errors when sending the message, since users can block DMs
                            }
                        } catch (error) {
                            logger.emit({ severityText: 'ERROR', body: `Failed to terminate server ${server.serverId}:`, attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)), serverId: server.serverId } });
                        }
                    }
                }
            })
        );

        // For the remaining servers, fetch the current status of each server and update the server activity (in parallel, allSettled)
        const statusResults = await Promise.allSettled(
            mergedServers.map(async (server) => {
                try {
                    const statusOutput = await serverCommander.query({
                        command: "status",
                        host: server.rconAddress,
                        password: server.rconPassword,
                        port: 27015,
                        timeout: 5000,
                    })
                    const serverStatus = new ServerStatus(statusOutput);
                    if (serverStatus.numberOfPlayers === 0 && server.emptySince === null) {
                        logger.emit({ severityText: 'INFO', body: `Server ${server.serverId} is empty.`, attributes: { serverId: server.serverId } });
                        server.emptySince = new Date();
                    }

                    if ((serverStatus.numberOfPlayers ?? 0) > 0) {
                        logger.emit({ severityText: 'INFO', body: `Server ${server.serverId} is not empty.`, attributes: { serverId: server.serverId } });
                        server.emptySince = null;
                    }
                } catch (error) {
                    // If error happens, assume server is empty to avoid servers running forever
                    // Only set emptySince if it wasn't already set to preserve the original timestamp
                    logger.emit({ severityText: 'ERROR', body: `Error fetching status for server ${server.serverId}:`, attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)), serverId: server.serverId } });
                    if (server.emptySince === null) {
                        server.emptySince = new Date();
                    }
                }

                server.lastCheckedAt = new Date();

                // Use transaction to ensure consistency when upserting activity
                try {
                    await serverRepository.runInTransaction(async (trx) => {
                        // Check if server still exists before upserting activity
                        const existingServer = await serverRepository.findById(server.serverId, trx);
                        if (!existingServer) {
                            logger.emit({ severityText: 'INFO', body: `Server ${server.serverId} no longer exists, skipping activity update.`, attributes: { serverId: server.serverId } });
                            return;
                        }

                        // Update the server activity repository
                        await serverActivityRepository.upsert({
                            serverId: server.serverId,
                            emptySince: server.emptySince!,
                            lastCheckedAt: server.lastCheckedAt!,
                        }, trx);
                    });
                } catch (error) {
                    logger.emit({ severityText: 'ERROR', body: `Failed to update activity for server ${server.serverId}:`, attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)), serverId: server.serverId } });
                    // Don't rethrow this error since it's not critical
                }
            })
        );
        const statusErrors = statusResults.filter(r => r.status === 'rejected');
        if (statusErrors.length > 0) {
            throw new Error(`One or more server status updates failed: ${statusErrors.map(e => (e as PromiseRejectedResult).reason).join('; ')}`);
        }
    }
}