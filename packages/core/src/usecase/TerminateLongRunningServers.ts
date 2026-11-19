import { logger } from '@tf2qs/telemetry';
import { Server } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManagerFactory } from '@tf2qs/core';
import { EventLogger } from "../services/EventLogger";

const MAX_HOURS = 12

export class TerminateLongRunningServers {
    private readonly warningThresholdMs = (MAX_HOURS - 1) * 60 * 60 * 1000;
    private readonly terminateThresholdMs = MAX_HOURS * 60 * 60 * 1000;

    constructor(private readonly dependencies: {
        serverRepository: ServerRepository,
        serverManagerFactory: ServerManagerFactory,
        serverCommander: ServerCommander,
        eventLogger: EventLogger
    }) {}

    async execute() {
        const { serverRepository } = this.dependencies;
        const servers = await serverRepository.getAllServers("ready");
        const now = Date.now();
        const runningMs = (server: Server) => server.createdAt ? now - new Date(server.createdAt).getTime() : 0;

        const serversToWarn = servers.filter(server => {
            const running = runningMs(server);
            return running > this.warningThresholdMs && running < this.terminateThresholdMs;
        });
        const serversToTerminate = servers.filter(server => runningMs(server) >= this.terminateThresholdMs);

        await Promise.allSettled([
            ...serversToWarn.map(server => this.warn(server)),
            ...serversToTerminate.map(server => this.terminate(server)),
        ]);
    }

    private async warn(server: Server) {
        try {
            await this.say(server, `say The server has been running for too long and will be automatically terminated when it reaches ${MAX_HOURS} hours`);
        } catch (error) {
            this.logFailure(server, 'warn', error);
        }
    }

    private async terminate(server: Server) {
        const { serverManagerFactory, serverRepository, eventLogger } = this.dependencies;
        try {
            await this.say(server, `say The server has been running for too long and is now being terminated.`);
        } catch (error) {
            this.logFailure(server, 'warn before termination', error);
        }

        try {
            const serverManager = serverManagerFactory.createServerManager(server.region);
            await serverManager.deleteServer({
                serverId: server.serverId,
                region: server.region
            });
            await serverRepository.deleteServer(server.serverId);
            await eventLogger.log({
                eventMessage: `Server ${server.serverId} terminated for exceeding ${MAX_HOURS} hours runtime.`,
                actorId: server.createdBy!
            });
        } catch (error) {
            this.logFailure(server, 'terminate', error);
        }
    }

    private async say(server: Server, command: string) {
        const { serverCommander } = this.dependencies;
        await serverCommander.query({
            command,
            host: server.rconAddress,
            port: 27015,
            password: server.rconPassword,
            timeout: 5000
        });
    }

    private logFailure(server: Server, action: string, error: unknown) {
        logger.emit({
            severityText: 'ERROR',
            body: `Failed to ${action} long running server ${server.serverId}`,
            attributes: {
                serverId: server.serverId,
                error: JSON.stringify(error, Object.getOwnPropertyNames(error))
            }
        });
    }
}
