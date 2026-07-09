import { Server } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";

type GetGuildServersParams = {
    guildId: string;
}

export class GetGuildServers {
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository;
    }) { }

    async execute(params: GetGuildServersParams): Promise<Server[]> {
        const { serverRepository } = this.dependencies;
        const { guildId } = params;

        const servers = await serverRepository.getAllServersByGuildId(guildId);

        // Only return servers that are ready (actively running)
        return servers.filter(server => server.status === "ready");
    }
}
