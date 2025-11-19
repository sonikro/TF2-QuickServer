import { UserError } from "../errors/UserError";
import { logger } from '@tf2qs/telemetry';
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManagerFactory } from '@tf2qs/providers/src/services/ServerManagerFactory';

export class DeleteServer {
    constructor(
        private readonly dependencies: {
            serverRepository: ServerRepository;
            serverActivityRepository: ServerActivityRepository;
            serverManagerFactory: ServerManagerFactory;
            eventLogger: EventLogger;
            serverAbortManager: ServerAbortManager;
        }
    ) {}

    async execute(args: {
        serverId: string;
    }): Promise<void> {
        const { serverRepository, serverActivityRepository, serverManagerFactory, eventLogger, serverAbortManager } = this.dependencies;
        const { serverId } = args;

        await serverRepository.runInTransaction(async (trx) => {
            const server = await serverRepository.findById(serverId, trx);

            if (!server) {
                throw new UserError("Server not found.");
            }

            await serverRepository.upsertServer({
                ...server,
                status: "terminating"
            }, trx);
        });

        const server = await serverRepository.findById(serverId);

        if (!server) {
            logger.emit({
                severityText: "INFO",
                body: `Server ${serverId} was already deleted, skipping.`,
                attributes: { serverId }
            });
            return;
        }

        try {
            const serverManager = serverManagerFactory.createServerManager(server.region);
            await serverManager.deleteServer({
                region: server.region,
                serverId
            });

            await serverRepository.runInTransaction(async (trx) => {
                const existingServer = await serverRepository.findById(serverId, trx);
                if (!existingServer) {
                    logger.emit({
                        severityText: "INFO",
                        body: `Server ${serverId} no longer exists, skipping cleanup.`,
                        attributes: { serverId }
                    });
                    return;
                }

                await serverRepository.deleteServer(serverId, trx);
                await serverActivityRepository.deleteById(serverId, trx);

                const abortController = serverAbortManager.getOrCreate(serverId);
                abortController.abort();
                serverAbortManager.delete(serverId);

                await eventLogger.log({
                    eventMessage: `Server ${serverId} deleted in region ${server.region}.`,
                    actorId: server.createdBy!,
                });
            });

            logger.emit({
                severityText: "INFO",
                body: `Server ${serverId} deleted successfully.`,
                attributes: { serverId }
            });
        } catch (error) {
            logger.emit({
                severityText: "ERROR",
                body: `Failed to delete server ${serverId}:`,
                attributes: {
                    serverId,
                    error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                }
            });
            throw error;
        }
    }
}
