import { ServerRepository } from "../repository/ServerRepository";
import { ServerManagerFactory } from '@tf2qs/providers/src/services/ServerManagerFactory';
import { EventLogger } from "../services/EventLogger";
import { Client as DiscordClient } from "discord.js";
import { ServerStatus } from "../domain/DeployedServer";

export class TerminatePendingServers {
    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory,
        serverRepository: ServerRepository,
        eventLogger: EventLogger,
        discordBot: DiscordClient
    }) { }

    /**
     * Terminates servers that have been stuck in 'pending' status for more than 10 minutes.
     */
    public async execute(): Promise<void> {
        const { serverManagerFactory, serverRepository, eventLogger, discordBot } = this.dependencies;
        // Fetch all servers with status 'pending'
        const servers = await serverRepository.getAllServers("pending");
        const now = new Date();
        const terminationPromises = servers.map(async (server) => {
            if (server.createdAt && server.status === "pending") {
                const pendingDuration = now.getTime() - server.createdAt.getTime();
                if (pendingDuration >= 15 * 60 * 1000) { // 15 minutes
                    try {
                        const serverManager = serverManagerFactory.createServerManager(server.region);
                        await serverManager.deleteServer({
                            region: server.region,
                            serverId: server.serverId,
                        });
                        await serverRepository.deleteServer(server.serverId);
                        await eventLogger.log({
                            eventMessage: `Server ${server.serverId} terminated after being stuck in pending for over 10 minutes.`,
                            actorId: server.createdBy || "system",
                        });
                        try {
                            if (server.createdBy) {
                                const user = await discordBot.users.fetch(server.createdBy);
                                if (user) {
                                    await user.send(`Your server ${server.serverId} was terminated after being stuck in pending for over 10 minutes.`);
                                }
                            }
                        } catch (error) {
                            // Ignore DM errors
                        }
                    } catch (error) {
                        if (error instanceof Error && error.message.includes("No container instance found")) {
                            // If the server was never created, just delete the record
                            await serverRepository.deleteServer(server.serverId);
                            await eventLogger.log({
                                eventMessage: `Server ${server.serverId} record deleted after being stuck in pending for over 10 minutes.`,
                                actorId: server.createdBy || "system",
                            });
                        } else {
                            throw error;
                        }
                    }
                }
            }
        });
        const results = await Promise.allSettled(terminationPromises);
        const rejected = results.filter(r => r.status === "rejected");
        if (rejected.length > 0) {
            // Use a local AggregateError polyfill (for Node <15)
            const error = new Error(`One or more server terminations failed: ${rejected.map(it => it.reason).join(",")}`);
            (error as any).errors = rejected.map(r => r.reason);
            throw error;
        }
    }
}
