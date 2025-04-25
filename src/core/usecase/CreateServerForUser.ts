import { Region, Server, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManager } from "../services/ServerManager";
import { ConfigManager } from "../utils/ConfigManager";
import { v4 as uuid } from "uuid";

export class CreateServerForUser {

    constructor(private readonly dependencies: {
        serverManager: ServerManager,
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository
        eventLogger: EventLogger,
        configManager: ConfigManager
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string
        adminSteamId?: string
    }): Promise<Server> {
        const { serverManager, serverRepository, userCreditsRepository, eventLogger, configManager } = this.dependencies;

        const creditsConfig = configManager.getCreditsConfig();

        if(creditsConfig.enabled){
            const userCredits = await userCreditsRepository.getCredits({userId: args.creatorId})
            if(!userCredits || userCredits <= 0){
                await eventLogger.log({
                    eventMessage: `User tried to create a server but has no credits.`,
                    actorId: args.creatorId
                });
                throw new UserError('You do not have enough credits to start a server.')
            }
        }
        const serverId = uuid();

        // Use a transaction to ensure atomicity and consistency
        // Also, if the server creation fails, we want the server ID To be in the database
        // so we can delete it later

        await serverRepository.runInTransaction(async (trx) => {
            const runningServers = await serverRepository.getAllServersByUserId(args.creatorId, trx);
            if (runningServers.length > 0) {
                throw new UserError('You already have a server running. Please terminate it before creating a new one.');
            }
        
            await serverRepository.upsertServer({
                serverId,
                region: args.region,
                variant: args.variantName,
                createdBy: args.creatorId,
                status: "pending",
            } as Server, trx);
        });
        
        const server = await serverManager.deployServer({
            region: args.region,
            variantName: args.variantName,
            sourcemodAdminSteamId: args.adminSteamId,
            serverId
        });
        
        await eventLogger.log(({
            actorId: args.creatorId,
            eventMessage: `User created a server in region ${args.region} with variant ${args.variantName} and AdminSteamID: ${args.adminSteamId}.`
        }))

        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
            status: "ready"
        });
        return server;
    }
}