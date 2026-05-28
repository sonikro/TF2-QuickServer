import { getRegionDisplayName, Region, Server, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { GuildParametersRepository } from "../repository/GuildParametersRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { UserRepository } from "../repository/UserRepository";
import { UserBanRepository } from "../repository/UserBanRepository";
import { EventLogger } from "../services/EventLogger";
import { IdGenerator } from "../services/IdGenerator";
import { ServerManagerFactory } from '@tf2qs/core';
import { StatusUpdater } from "../services/StatusUpdater";
import { ConfigManager } from "../utils/ConfigManager";
import SteamID from "steamid";
import { logger } from '@tf2qs/telemetry';
export class CreateServerForUser {

    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory,
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository,
        guildParametersRepository: GuildParametersRepository,
        eventLogger: EventLogger,
        sourceTvEventLogger: EventLogger,
        configManager: ConfigManager,
        userRepository: UserRepository,
        userBanRepository: UserBanRepository,
        idGenerator: IdGenerator,
    }) { }

    public async execute(args: {
        region: Region,
        variantName: Variant,
        creatorId: string,
        guildId: string,
        statusUpdater: StatusUpdater
    }): Promise<Server> {
        const { serverManagerFactory, serverRepository, userCreditsRepository, eventLogger, sourceTvEventLogger, configManager, userRepository, guildParametersRepository, userBanRepository, idGenerator } = this.dependencies;
        const statusUpdater = args.statusUpdater;
        
        const serverManager = serverManagerFactory.createServerManager(args.region);
        const user = await userRepository.getById(args.creatorId);
        if (!user || !user.steamIdText) {
            throw new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.');
        }

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
        const serverId = idGenerator.generate();

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
                status: "pending",
            } as Server, trx);
        });

        const guildParameters = await guildParametersRepository.findById(args.guildId);
        
        const server = await serverManager.deployServer({
            region: args.region,
            variantName: args.variantName,
            sourcemodAdminSteamId: user.steamIdText,
            serverId,
            extraEnvs: guildParameters?.environment_variables || {},
            statusUpdater
        });
        
        await eventLogger.log(({
            actorId: args.creatorId,
            eventMessage: `User created a server in region ${args.region} with variant ${args.variantName}`
        }))

        const regionDisplayName = getRegionDisplayName(args.region);
        const passwordPart = server.tvPassword ? `;password ${server.tvPassword}` : '';
        await sourceTvEventLogger.log({
            actorId: args.creatorId,
            eventMessage: `Server created with variant **${args.variantName}** on region **${regionDisplayName}**.\nSourceTV: \`connect ${server.tvIp}:${server.tvPort}${passwordPart}\``
        });

        await serverRepository.upsertServer({
            ...server,
            createdBy: args.creatorId,
            status: "ready"
        });
        return server;
    }
}
