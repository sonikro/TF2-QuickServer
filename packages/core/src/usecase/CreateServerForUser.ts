import { Region, Server, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { GuildParametersRepository } from "../repository/GuildParametersRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { UserRepository } from "../repository/UserRepository";
import { UserBanRepository } from "../repository/UserBanRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManagerFactory } from '@tf2qs/providers';
import { StatusUpdater } from "../services/StatusUpdater";
import { ConfigManager } from "../utils/ConfigManager";
import { v4 as uuid } from "uuid";
import SteamID from "steamid";
import { logger } from '@tf2qs/telemetry';
export class CreateServerForUser {

    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory,
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository,
        guildParametersRepository: GuildParametersRepository,
        eventLogger: EventLogger,
        configManager: ConfigManager,
        userRepository: UserRepository,
        userBanRepository: UserBanRepository,
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string,
        guildId: string,
        statusUpdater: StatusUpdater
    }): Promise<Server> {
        const { serverManagerFactory, serverRepository, userCreditsRepository, eventLogger, configManager, userRepository, guildParametersRepository, userBanRepository } = this.dependencies;
        const statusUpdater = args.statusUpdater;
        
        // Get the appropriate server manager for this region
        const serverManager = serverManagerFactory.createServerManager(args.region);
        const user = await userRepository.getById(args.creatorId);
        if (!user || !user.steamIdText) {
            throw new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.');
        }

        // Check if user is banned
        const steamId = new SteamID(user.steamIdText);
        const steamID3 = steamId.steam3().replace("[", "").replace("]", "");
        
        logger.emit({
            severityText: 'INFO',
            body: 'Checking if user is banned before creating server',
            attributes: {
                userId: args.creatorId,
                steamID3,
                region: args.region,
                variant: args.variantName
            }
        });
        
        const banResult = await userBanRepository.isUserBanned(steamID3, args.creatorId);
        
        if (banResult.isBanned) {
            logger.emit({
                severityText: 'WARN',
                body: 'Banned user attempted to create server',
                attributes: {
                    userId: args.creatorId,
                    steamID3,
                    banReason: banResult.reason || 'No reason provided'
                }
            });
            throw new UserError(`You are banned and cannot create servers. Reason: ${banResult.reason || 'No reason provided'}`);
        }
        
        logger.emit({
            severityText: 'DEBUG',
            body: 'User is not banned, proceeding with server creation',
            attributes: {
                userId: args.creatorId,
                steamID3
            }
        });

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
            const allServers = await serverRepository.getAllServersByUserId(args.creatorId, trx);
            const runningServers = allServers.filter(server => server.status === "ready" || server.status === "pending");
            if (runningServers.length > 0) {
                throw new UserError('You already have a server running. Please terminate it before creating a new one.');
            }
        
            await serverRepository.upsertServer({
                serverId,
                region: args.region,
                variant: args.variantName,
                createdBy: args.creatorId,
                guildId: args.guildId,
                status: "pending",
            } as Server, trx);
        });

        const guildParameters = await guildParametersRepository.findById(args.guildId);
        
        const server = await serverManager.deployServer({
            region: args.region,
            variantName: args.variantName,
            sourcemodAdminSteamId: user.steamIdText,
            serverId,
            guildId: args.guildId,
            extraEnvs: guildParameters?.environment_variables || {},
            statusUpdater
        });
        
        await eventLogger.log(({
            actorId: args.creatorId,
            eventMessage: `User created a server in region ${args.region} with variant ${args.variantName}`
        }))

        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
            guildId: args.guildId,
            status: "ready"
        });
        return server;
    }
}