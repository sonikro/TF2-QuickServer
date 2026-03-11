import { Region, Server, Variant } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerManagerFactory } from "../services/ServerManagerFactory";
import { StatusUpdater } from "../services/StatusUpdater";
import { IdGenerator } from "../services/IdGenerator";
import { logger } from '@tf2qs/telemetry';

export type CreateServerForClientParams = {
    region: Region;
    variantName: Variant;
    clientId: string;
    extraEnvs?: Record<string, string>;
    statusUpdater?: StatusUpdater;
};

export class CreateServerForClient {

    constructor(private readonly dependencies: {
        serverManagerFactory: ServerManagerFactory;
        serverRepository: ServerRepository;
        idGenerator: IdGenerator;
    }) { }

    public async execute(args: CreateServerForClientParams): Promise<Server> {
        const { serverManagerFactory, serverRepository, idGenerator } = this.dependencies;
        const statusUpdater: StatusUpdater = args.statusUpdater ?? (async () => {});

        const serverManager = serverManagerFactory.createServerManager(args.region);

        logger.emit({
            severityText: 'INFO',
            body: 'API client creating server',
            attributes: {
                clientId: args.clientId,
                region: args.region,
                variant: args.variantName,
            },
        });

        const serverId = idGenerator.generate();

        await serverRepository.upsertServer({
            serverId,
            region: args.region,
            variant: args.variantName,
            createdBy: args.clientId,
            status: "pending",
        } as Server);

        const server = await serverManager.deployServer({
            serverId,
            region: args.region,
            variantName: args.variantName,
            extraEnvs: args.extraEnvs ?? {},
            statusUpdater,
        });

        await serverRepository.upsertServer({
            ...server,
            createdBy: args.clientId,
            status: "ready",
        });

        logger.emit({
            severityText: 'INFO',
            body: 'API client server created successfully',
            attributes: {
                clientId: args.clientId,
                serverId: server.serverId,
                region: args.region,
            },
        });

        return server;
    }
}
