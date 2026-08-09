import { ServerRepository } from "../repository/ServerRepository";

export type SourceTvInfo = {
    serverId: string;
    hostIp: string;
    hostPort: number;
    tvIp: string;
    tvPort: number;
    tvPassword?: string;
};

export class GetSourceTvInfo {
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository;
    }) { }

    async execute(): Promise<SourceTvInfo[]> {
        const { serverRepository } = this.dependencies;

        const servers = await serverRepository.getAllServers();

        return servers
            .filter(server => server.status === "ready")
            .map(server => ({
                serverId: server.serverId,
                hostIp: server.hostIp,
                hostPort: server.hostPort,
                tvIp: server.tvIp,
                tvPort: server.tvPort,
                tvPassword: server.tvPassword,
            }));
    }
}