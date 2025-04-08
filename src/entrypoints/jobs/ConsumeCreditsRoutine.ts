import schedule from "node-schedule";

import { ConsumeCreditsFromRunningServers } from "../../core/usecase/ConsumeCreditsFromRunningServers"

export const scheduleConsumeCreditsRoutine = (dependencies: {
    consumeCreditsFromRunningServers: ConsumeCreditsFromRunningServers
}) => {
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