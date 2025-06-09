import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManager } from "../services/ServerManager";

export class DeleteServerForUser {
    constructor(
        private readonly dependencies: {
            serverRepository: ServerRepository;
            serverManager: ServerManager;
            eventLogger: EventLogger;
            serverAbortManager: ServerAbortManager
        }
    ) { }

    async execute(args: {
        userId: string;
    }): Promise<void> {
        const { serverRepository, serverManager, eventLogger, serverAbortManager } = this.dependencies;
        const { userId } = args;
        const server = await serverRepository.getAllServersByUserId(userId);
        const pendingServers = server.filter(s => s.status === "pending");
        if (pendingServers.length > 0) {
            throw new UserError("You have a server that is still being created. Please wait until it is ready before deleting.");
        }

        if (!server || server.length === 0) {
            throw new UserError("You don't have any servers to terminate.");
        }

        const settled = await Promise.allSettled(server.map(async (s) => {
            const { serverId, region } = s;
            // Perform server-specific cleanup using ServerManager
            await serverManager.deleteServer({
                region,
                serverId
            });
            // Delete the server
            await serverRepository.deleteServer(serverId);
            const abortController = serverAbortManager.getOrCreate(serverId);
            // Abort any ongoing operations for this server
            abortController.abort();
            // Remove the abort controller from the manager
            serverAbortManager.delete(serverId);
            await eventLogger.log({
                eventMessage: `User deleted server with ID ${serverId} in region ${region}.`,
                actorId: userId,
            });
        }));

        const errors = settled.filter(result => result.status === 'rejected');
        if (errors.length > 0) {
            const errorMessages = errors.map(error => (error as PromiseRejectedResult).reason.message).join(', ');
            await eventLogger.log({
                eventMessage: `Failed to delete some servers: ${errorMessages}`,
                actorId: userId,
            })
            throw new UserError(`Failed to delete some servers, please reach out to support.`)
        }
    }
}
