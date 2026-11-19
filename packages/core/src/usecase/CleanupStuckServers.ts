import { Client as DiscordClient } from "discord.js";
import { Server } from "../domain/DeployedServer";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManagerFactory } from '@tf2qs/core';

const PENDING_STUCK_THRESHOLD_MS = 15 * 60 * 1000;
const TERMINATING_STUCK_THRESHOLD_MS = 15 * 60 * 1000;

export class CleanupStuckServers {
    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory,
        serverRepository: ServerRepository,
        serverActivityRepository: ServerActivityRepository,
        serverAbortManager: ServerAbortManager,
        eventLogger: EventLogger,
        discordBot: DiscordClient
    }) { }

    /**
     * Retries servers stuck in 'pending' or 'terminating'. A half-finished
     * termination leaves the row and its cloud resources behind, and nothing
     * else would ever retry it.
     */
    public async execute(): Promise<void> {
        const { serverRepository, serverAbortManager } = this.dependencies;
        const now = Date.now();
        const [pendingServers, terminatingServers] = await Promise.all([
            serverRepository.getAllServers("pending"),
            serverRepository.getAllServers("terminating"),
        ]);

        const results = await Promise.allSettled([
            // Only the OCI manager registers an abort controller; AWS pending
            // rows are reaped on the grace period alone, as they were before.
            ...pendingServers
                .filter(server => this.isPendingStuck(server, now))
                .filter(server => !serverAbortManager.has(server.serverId))
                .map(server => this.terminatePendingServer(server)),
            ...terminatingServers
                .filter(server => this.isTerminatingStuck(server, now))
                .map(server => this.retryTermination(server)),
        ]);

        const rejected = results.filter(result => result.status === "rejected");
        if (rejected.length > 0) {
            const error = new Error(`One or more server terminations failed: ${rejected.map(result => (result as PromiseRejectedResult).reason).join(",")}`);
            (error as any).errors = rejected.map(result => (result as PromiseRejectedResult).reason);
            throw error;
        }
    }

    private isPendingStuck(server: Server, now: number): boolean {
        if (!server.createdAt) return false;
        return now - server.createdAt.getTime() >= PENDING_STUCK_THRESHOLD_MS;
    }

    private isTerminatingStuck(server: Server, now: number): boolean {
        if (!server.terminatingAt) return false;
        return now - server.terminatingAt.getTime() >= TERMINATING_STUCK_THRESHOLD_MS;
    }

    private async terminatePendingServer(server: Server): Promise<void> {
        const { serverManagerFactory, serverAbortManager, eventLogger } = this.dependencies;
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
        await this.releaseAbortController(server.serverId);
        await this.notifyCreator(server);
    }

    private async retryTermination(server: Server): Promise<void> {
        const { serverManagerFactory, eventLogger } = this.dependencies;
        const serverManager = serverManagerFactory.createServerManager(server.region);
        await serverManager.deleteServer({
            region: server.region,
            serverId: server.serverId,
        });
        await this.deleteServerRecord(server.serverId);
        await eventLogger.log({
            eventMessage: `Server ${server.serverId} terminated after being stuck in terminating for over 15 minutes.`,
            actorId: server.createdBy || "system",
        });
        await this.releaseAbortController(server.serverId);
    }

    private async deleteServerRecord(serverId: string): Promise<void> {
        const { serverRepository, serverActivityRepository } = this.dependencies;
        await serverRepository.runInTransaction(async trx => {
            await serverRepository.deleteServer(serverId, trx);
            await serverActivityRepository.deleteById(serverId, trx);
        });
    }

    private async releaseAbortController(serverId: string): Promise<void> {
        const { serverAbortManager } = this.dependencies;
        serverAbortManager.getOrCreate(serverId).abort();
        serverAbortManager.delete(serverId);
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
}
