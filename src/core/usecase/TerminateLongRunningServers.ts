import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManager } from "../services/ServerManager";

export class TerminateLongRunningServers {
    private readonly warningThresholdMs = 9 * 60 * 60 * 1000; // 9 hours
    private readonly terminateThresholdMs = 10 * 60 * 60 * 1000; // 10 hours

    constructor(private readonly dependencies: {
        serverRepository: ServerRepository,
        serverManager: ServerManager,
        serverCommander: ServerCommander,
        eventLogger: EventLogger
    }) {}

    async execute() {
        const { serverRepository, serverManager, serverCommander, eventLogger } = this.dependencies;
        const servers = await serverRepository.getAllServers();
        const now = Date.now();
        const settledPromises: PromiseSettledResult<any>[] = [];

        // Send warning to servers running >9h but <10h
        const warningPromises = await Promise.allSettled(servers.filter(server => {
            if (!server.createdAt) return false;
            const runningMs = now - new Date(server.createdAt).getTime();
            return runningMs > this.warningThresholdMs && runningMs < this.terminateThresholdMs;
        }).map(async server => {
            await serverCommander.query({
                command: `say The server has been running for too long and will be automatically terminated when it reaches 10 hours`,
                host: server.rconAddress,
                port: 27015,
                password: server.rconPassword,
                timeout: 5000
            });
        }));
        settledPromises.push(...warningPromises);

        // Terminate servers running >=10h
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
            await serverManager.deleteServer({
                serverId: server.serverId,
                region: server.region
            });
            await serverRepository.deleteServer(server.serverId);
            await eventLogger.log({
                eventMessage: `Server ${server.serverId} terminated for exceeding 10 hours runtime.`,
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
