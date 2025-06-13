import { ServerRepository } from "../repository/ServerRepository";
import { ServerManager } from "../services/ServerManager";
import { EventLogger } from "../services/EventLogger";
import { Client as DiscordClient } from "discord.js";
import { ServerStatus } from "../domain/DeployedServer";

export class TerminatePendingServers {
    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository,
        eventLogger: EventLogger,
        discordBot: DiscordClient
    }) { }

    /**
     * Terminates servers that have been stuck in 'pending' status for more than 10 minutes.
     */
    public async execute(): Promise<void> {
        const { serverManager, serverRepository, eventLogger, discordBot } = this.dependencies;
        // Fetch all servers with status 'pending'
        const servers = await serverRepository.getAllServers("pending");
        const now = new Date();
        for (const server of servers) {
            if (server.createdAt && server.status === "pending") {
                const pendingDuration = now.getTime() - server.createdAt.getTime();
                if (pendingDuration >= 10 * 60 * 1000) { // 10 minutes
                    try {
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
                        console.error(`Failed to terminate pending server ${server.serverId}:`, error);
                    }
                }
            }
        }
    }
}
