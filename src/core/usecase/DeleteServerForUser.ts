import { UserError } from "../errors/UserError";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManagerFactory } from "../../providers/services/ServerManagerFactory";

export class DeleteServerForUser {
    constructor(
        private readonly dependencies: {
            serverRepository: ServerRepository;
            serverActivityRepository: ServerActivityRepository;
            serverManagerFactory: ServerManagerFactory;
            eventLogger: EventLogger;
            serverAbortManager: ServerAbortManager
        }
    ) { }

    async execute(args: {
        userId: string;
    }): Promise<void> {
        const { serverRepository, serverActivityRepository, serverManagerFactory, eventLogger, serverAbortManager } = this.dependencies;
        const { userId } = args;
        
        // Use transaction to ensure consistency
        await serverRepository.runInTransaction(async (trx) => {
            const server = await serverRepository.getAllServersByUserId(userId, trx);

            if (!server || server.length === 0) {
                throw new UserError("You don't have any servers to terminate.");
            }

            // Mark all servers as terminating
            for (const s of server) {
                await serverRepository.upsertServer({
                    ...s,
                    status: "terminating"
                }, trx);
            }
        });

        const server = await serverRepository.getAllServersByUserId(userId);
        const terminatingServers = server.filter(s => s.status === "terminating");

        const settled = await Promise.allSettled(terminatingServers.map(async (s) => {
            const { serverId, region } = s;
            const serverManager = serverManagerFactory.createServerManager(region);
            await serverManager.deleteServer({
                region,
                serverId
            });
            return s;
        }));

        const successfulDeletions = settled
            .filter((result) => result.status === 'fulfilled')
            .map((result) => (result as PromiseFulfilledResult<typeof terminatingServers[0]>).value);

        const failedDeletions = settled
            .filter((result) => result.status === 'rejected')
            .map((result) => (result as PromiseRejectedResult).reason.message);

        if (failedDeletions.length > 0) {
            await eventLogger.log({
                eventMessage: `Failed to delete some servers: ${failedDeletions.join(', ')}`,
                actorId: userId,
            });
        }

        if (successfulDeletions.length > 0) {
            await serverRepository.runInTransaction(async (trx) => {
                for (const s of successfulDeletions) {
                    const { serverId } = s;
                    await serverRepository.deleteServer(serverId, trx);
                    await serverActivityRepository.deleteById(serverId, trx);
                    
                    const abortController = serverAbortManager.getOrCreate(serverId);
                    abortController.abort();
                    serverAbortManager.delete(serverId);
                    
                    await eventLogger.log({
                        eventMessage: `User deleted server with ID ${serverId} in region ${s.region}.`,
                        actorId: userId,
                    });
                }
            });
        }

        if (failedDeletions.length > 0) {
            throw new UserError(`Failed to delete some servers, please reach out to support.`);
        }
    }
}
