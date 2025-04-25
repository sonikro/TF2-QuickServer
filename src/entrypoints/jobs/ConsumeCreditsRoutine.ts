import schedule from "node-schedule";

import { ConsumeCreditsFromRunningServers } from "../../core/usecase/ConsumeCreditsFromRunningServers"
import { ConfigManager } from "../../core/utils/ConfigManager";

export const scheduleConsumeCreditsRoutine = (dependencies: {
    consumeCreditsFromRunningServers: ConsumeCreditsFromRunningServers
    configManager: ConfigManager
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
        }
    })
}