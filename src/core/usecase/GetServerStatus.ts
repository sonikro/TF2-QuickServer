import { getRegionDisplayName, getRegions } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";

export type ServerStatusSummary = {
    region: string;
    displayName: string;
    servers: {
        ready: number;
        pending: number;
        terminating: number;
        total: number;
    }
}

export class GetServerStatus {
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository;
    }) { }

    public async execute(): Promise<ServerStatusSummary[]> {
        const { serverRepository } = this.dependencies;

        const allServers = await serverRepository.getAllServers();
        const regions = getRegions();

        const summary = regions.map(region => {
            const serversInRegion = allServers.filter(server => server.region === region);
            
            const ready = serversInRegion.filter(server => server.status === "ready").length;
            const pending = serversInRegion.filter(server => server.status === "pending").length;
            const terminating = serversInRegion.filter(server => server.status === "terminating").length;

            return {
                region,
                displayName: getRegionDisplayName(region),
                servers: {
                    ready,
                    pending,
                    terminating,
                    total: serversInRegion.length
                }
            };
        });

        return summary;
    }
}
