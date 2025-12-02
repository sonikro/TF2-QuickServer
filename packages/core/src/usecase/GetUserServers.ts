import { Server } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";

type GetUserServersParams = {
    userId: string;
}

export class GetUserServers {
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository;
    }) { }

    async execute(params: GetUserServersParams): Promise<Server[]> {
        const { serverRepository } = this.dependencies;
        const { userId } = params;

        const servers = await serverRepository.getAllServersByUserId(userId);
        return servers;
    }
}
