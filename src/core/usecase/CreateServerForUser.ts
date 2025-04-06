import { Region, Server, Variant } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerManager } from "../services/ServerManager";

export class CreateServerForUser {

    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string
    }): Promise<Server> {
        const { serverManager, serverRepository } = this.dependencies;
        const server = await serverManager.deployServer({
            region: args.region,
            variantName: args.variantName,
        });
        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
        });
        return server;
    }
}