import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManager } from "../services/ServerManager";

export class DeleteServerForUser {
    constructor(
        private readonly dependencies: {
            serverRepository: ServerRepository;
            serverManager: ServerManager;
            eventLogger: EventLogger;
        }
    ) { }

    async execute(args: {
        userId: string;
    }): Promise<void> {
        const { serverRepository, serverManager, eventLogger } = this.dependencies;
        const { userId } = args;
        const server = await serverRepository.getAllServersByUserId(userId);
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
