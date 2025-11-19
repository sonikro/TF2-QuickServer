import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManagerFactory } from '@tf2qs/providers/src/services/ServerManagerFactory';

export class TerminateServersWithoutCredit {

    private readonly lowCreditThreshold = 10
    private readonly noCreditThreshold = 0
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository
        serverManagerFactory: ServerManagerFactory,
        serverCommander: ServerCommander
        eventLogger: EventLogger
    }) { }
    async execute() {

        const { serverCommander, serverManagerFactory, serverRepository, userCreditsRepository, eventLogger } = this.dependencies

        const servers = await serverRepository.getAllServers()

        const serversWithCreditInformation = await Promise.all(servers.map(async server => {
            const credits = await userCreditsRepository.getCredits({ userId: server.createdBy! })
            return {
                ...server,
                credits
            }
        }))

        const serversLowOnCredits = serversWithCreditInformation.filter(server => server.credits <= this.lowCreditThreshold)
        const serversWithoutCredits = serversWithCreditInformation.filter(server => server.credits <= this.noCreditThreshold)

        const settledPromises: PromiseSettledResult<any>[] = []
        // Send warning to players with low credits
        const warningPromises = await Promise.allSettled(serversLowOnCredits.map(async server => {
            await serverCommander.query({
                command: `say You have only ${server.credits} credits left. The server will be terminated if you run out of credits.`,
                host: server.rconAddress,
                port: 27015,
                password: server.rconPassword,
                timeout: 5000
            })
        }))
        settledPromises.push(...warningPromises)

        // Terminate servers without credits
        const terminationPromises = await Promise.allSettled(serversWithoutCredits.map(async server => {
            // Get the appropriate server manager for this region
            const serverManager = serverManagerFactory.createServerManager(server.region);
            await serverCommander.query({
                command: `say Your server is being terminated due to lack of credits.`,
                host: server.rconAddress,
                port: 27015,
                password: server.rconPassword,
                timeout: 5000
            })
            await serverManager.deleteServer({
                serverId: server.serverId,
                region: server.region
            })
            await serverRepository.deleteServer(server.serverId)
            await eventLogger.log({
                eventMessage: `Server ${server.serverId} terminated due to lack of credits.`,
                actorId: server.createdBy!
            })
        }))
        settledPromises.push(...terminationPromises)

        // Throw an error if any of the promises failed
        const errors = settledPromises.filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason)
        if (errors.length > 0) {
            throw new Error(`Failed to terminate some servers: ${errors.join(', ')}`)
        }
    }
}