import schedule from "node-schedule";

import { ConsumeCreditsFromRunningServers } from "../../core/usecase/ConsumeCreditsFromRunningServers"
import { ConfigManager } from "../../core/utils/ConfigManager";
import { EventLogger } from "../../core/services/EventLogger";

export const scheduleConsumeCreditsRoutine = (dependencies: {
    consumeCreditsFromRunningServers: ConsumeCreditsFromRunningServers,
    configManager: ConfigManager,
    eventLogger: EventLogger
}) => {
    const creditsConfig = dependencies.configManager.getCreditsConfig();
    if (!creditsConfig.enabled) {
        console.log('Consume Credits Routine is disabled in the configuration.');
        return;
    }
    schedule.scheduleJob('* * * * *', async () => {
        try {
            console.log('Running Consume Credits Routine...')
            await dependencies.consumeCreditsFromRunningServers.execute()
            console.log('Consume Credits Routine completed successfully.')
        } catch (error) {
            console.error('Error during Consume Credits Routine', error)
            await dependencies.eventLogger.log({
                eventMessage: `Error during Consume Credits Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    })
}