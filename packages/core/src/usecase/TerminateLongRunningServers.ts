import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManagerFactory } from '@tf2qs/providers';

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
        const { serverRepository, serverManagerFactory, serverCommander, eventLogger } = this.dependencies;
        const servers = await serverRepository.getAllServers();
        const now = Date.now();
        const settledPromises: PromiseSettledResult<any>[] = [];

        // Send warning to servers running >11h but <12h
        const warningPromises = await Promise.allSettled(servers.filter(server => {
            if (!server.createdAt) return false;
            const runningMs = now - new Date(server.createdAt).getTime();
            return runningMs > this.warningThresholdMs && runningMs < this.terminateThresholdMs;
        }).map(async server => {
            await serverCommander.query({
                command: `say The server has been running for too long and will be automatically terminated when it reaches ${MAX_HOURS} hours`,
                host: server.rconAddress,
                port: 27015,
                password: server.rconPassword,
                timeout: 5000
            });
        }));
        settledPromises.push(...warningPromises);

        // Terminate servers running >=12h
        const terminatePromises = await Promise.allSettled(servers.filter(server => {
            if (!server.createdAt) return false;
            const runningMs = now - new Date(server.createdAt).getTime();
            return runningMs >= this.terminateThresholdMs;
        }).map(async server => {
            await serverCommander.query({
                command: `say The server has been running for too long and is now being terminated.`,
                host: server.rconAddress,
                port: 27015,
                password: server.rconPassword,
                timeout: 5000
            });
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
        }));
        settledPromises.push(...terminatePromises);

        // Throw an error if any of the promises failed
        const errors = settledPromises.filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason);
        if (errors.length > 0) {
            throw new Error(`Failed to terminate or warn some servers: ${errors.join(', ')}`);
        }
    }
}
