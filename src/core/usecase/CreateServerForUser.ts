import { Region, Server, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { UserRepository } from "../repository/UserRepository";
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
        userRepository: UserRepository
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string
    }): Promise<Server> {
        const { serverManager, serverRepository, userCreditsRepository, eventLogger, configManager, userRepository } = this.dependencies;

        const user = await userRepository.getById(args.creatorId);
        if (!user || !user.steamIdText) {
            throw new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.');
        }

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
            sourcemodAdminSteamId: user.steamIdText,
            serverId
        });
        
        await eventLogger.log(({
            actorId: args.creatorId,
            eventMessage: `User created a server in region ${args.region} with variant ${args.variantName}`
        }))

        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
            status: "ready"
        });
        return server;
    }
}