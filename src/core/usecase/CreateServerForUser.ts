import { Region, Server, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { ServerManager } from "../services/ServerManager";

export class CreateServerForUser {

    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string
        adminSteamId?: string
    }): Promise<Server> {
        const { serverManager, serverRepository, userCreditsRepository } = this.dependencies;

        const userCredits = await userCreditsRepository.getCredits({userId: args.creatorId})

        if(!userCredits || userCredits <= 0){
            throw new UserError('You do not have enough credits to start a server.')
        }

        const server = await serverManager.deployServer({
            region: args.region,
            variantName: args.variantName,
            sourcemodAdminSteamId: args.adminSteamId,
        });
        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
        });
        return server;
    }
}