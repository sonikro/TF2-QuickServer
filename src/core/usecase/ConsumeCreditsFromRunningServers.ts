import { logger } from '../../telemetry/otel';
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";


/**
 * Represents a record of credits consumed by running servers.
 * The keys are user ids
 * and the values are the number of credits consumed from each user.
 */
export type CreditsConsumed = Record<string, number>;

export class ConsumeCreditsFromRunningServers {
    constructor(private readonly dependencies: {
        serverRepository: ServerRepository,
        userCreditsRepository: UserCreditsRepository
    }) {}

    async execute(): Promise<CreditsConsumed> {
        const { userCreditsRepository, serverRepository } = this.dependencies;

        const servers = await serverRepository.getAllServers();
        const creditsConsumed: CreditsConsumed = {};

        servers.forEach(server => {
            creditsConsumed[server.createdBy!] = (creditsConsumed[server.createdBy!] || 0) + 1
        })

        Object.entries(creditsConsumed).map(async ([key, value]) => {
            await userCreditsRepository.subtractCredits({
                credits: value,
                userId: key
            })
            logger.emit({ severityText: 'INFO', body: `Subtracted ${value} credits from user ${key}` });
        })

        return creditsConsumed
    }
}