import { Client as DiscordClient } from "discord.js";
import { Server } from "../domain/DeployedServer";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManagerFactory } from '@tf2qs/core';

const STUCK_THRESHOLD_MS = 15 * 60 * 1000;
const MISSING_RESOURCE_ERROR = "No container instance found";

export class CleanupStuckServers {
    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory,
        serverRepository: ServerRepository,
        serverActivityRepository: ServerActivityRepository,
        eventLogger: EventLogger,
        discordBot: DiscordClient
    }) { }

    /**
     * Retries servers stuck in 'pending' or 'terminating' for more than 15
     * minutes. A termination that died halfway leaves the row (and its cloud
     * resources) behind, and nothing else would ever retry it.
     */
    public async execute(): Promise<void> {
        const { serverRepository } = this.dependencies;
        const now = Date.now();
        const [pendingServers, terminatingServers] = await Promise.all([
            serverRepository.getAllServers("pending"),
            serverRepository.getAllServers("terminating"),
        ]);

        const results = await Promise.allSettled([
            ...pendingServers.filter(server => this.isStuck(server, now)).map(server => this.terminatePendingServer(server)),
            ...terminatingServers.filter(server => this.isStuck(server, now)).map(server => this.retryTermination(server)),
        ]);

        const rejected = results.filter(result => result.status === "rejected");
        if (rejected.length > 0) {
            const error = new Error(`One or more server terminations failed: ${rejected.map(result => (result as PromiseRejectedResult).reason).join(",")}`);
            (error as any).errors = rejected.map(result => (result as PromiseRejectedResult).reason);
            throw error;
        }
    }

    private isStuck(server: Server, now: number): boolean {
        if (!server.createdAt) return false;
        return now - server.createdAt.getTime() >= STUCK_THRESHOLD_MS;
    }

    private async terminatePendingServer(server: Server): Promise<void> {
        const { serverManagerFactory, eventLogger } = this.dependencies;
        try {
            const serverManager = serverManagerFactory.createServerManager(server.region);
            await serverManager.deleteServer({
                region: server.region,
                serverId: server.serverId,
            });
            await this.deleteServerRecord(server.serverId);
            await eventLogger.log({
                eventMessage: `Server ${server.serverId} terminated after being stuck in pending for over 15 minutes.`,
                actorId: server.createdBy || "system",
            });
            await this.notifyCreator(server);
        } catch (error) {
            if (!this.isMissingResourceError(error)) {
                throw error;
            }
            await this.deleteServerRecord(server.serverId);
            await eventLogger.log({
                eventMessage: `Server ${server.serverId} record deleted after being stuck in pending for over 15 minutes.`,
                actorId: server.createdBy || "system",
            });
        }
    }

    private async retryTermination(server: Server): Promise<void> {
        const { serverManagerFactory, eventLogger } = this.dependencies;
        try {
            const serverManager = serverManagerFactory.createServerManager(server.region);
            await serverManager.deleteServer({
                region: server.region,
                serverId: server.serverId,
            });
        } catch (error) {
            if (!this.isMissingResourceError(error)) {
                throw error;
            }
        }

        await this.deleteServerRecord(server.serverId);
        await eventLogger.log({
            eventMessage: `Server ${server.serverId} terminated after being stuck in terminating for over 15 minutes.`,
            actorId: server.createdBy || "system",
        });
    }

    private async deleteServerRecord(serverId: string): Promise<void> {
        const { serverRepository, serverActivityRepository } = this.dependencies;
        await serverRepository.runInTransaction(async trx => {
            await serverRepository.deleteServer(serverId, trx);
            await serverActivityRepository.deleteById(serverId, trx);
        });
    }

    private async notifyCreator(server: Server): Promise<void> {
        const { discordBot } = this.dependencies;
        if (!server.createdBy) return;
        try {
            const user = await discordBot.users.fetch(server.createdBy);
            await user.send(`Your server ${server.serverId} was terminated after being stuck in pending for over 15 minutes.`);
        } catch {
            // A failed DM must not fail a termination that already happened.
        }
    }

    private isMissingResourceError(error: unknown): boolean {
        return error instanceof Error && error.message.includes(MISSING_RESOURCE_ERROR);
    }
}
