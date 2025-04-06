import { Region } from "../domain";
import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerManager } from "../services/ServerManager";

export class DeleteServerForUser {
    constructor(
        private readonly dependencies: {
            serverRepository: ServerRepository;
            serverManager: ServerManager;
        }
    ) {}

    async execute(args: {
        serverId: string;
        userId: string;
        region: Region;
    }): Promise<void> {
        const { serverRepository, serverManager } = this.dependencies;
        const { serverId, userId, region } = args;
        // Validate if the server exists and belongs to the user
        const server = await serverRepository.findById(serverId);
        if (!server || server.createdBy !== userId) {
            throw new UserError(`Server with ID ${serverId} does not exist or does not belong to the user.`);
        }

        // Perform server-specific cleanup using ServerManager
        await serverManager.deleteServer({
            region,
            serverId
        });

        // Delete the server
        await serverRepository.deleteServer(serverId);
    }
}
