import schedule from 'node-schedule';
import { TerminateServersWithoutCredit } from '../../core/usecase/TerminateServersWithoutCredit';
import { ConfigManager } from '../../core/utils/ConfigManager';
import { EventLogger } from '../../core/services/EventLogger';

// Schedule a job to run every minute
export const scheduleTerminateServersWithoutCreditRoutine = (dependencies: {
    terminateServersWithoutCredit: TerminateServersWithoutCredit,
    configManager: ConfigManager,
    eventLogger: EventLogger
}) => {
    const creditsConfig = dependencies.configManager.getCreditsConfig();
    if (!creditsConfig.enabled) {
        console.log('Terminate Servers without credit Routine is disabled in the configuration.');
        return;
    }
    schedule.scheduleJob('* * * * *', async () => {
        try {
            console.log('Running Terminate Servers without credit routine...');
            await dependencies.terminateServersWithoutCredit.execute()
            console.log('Terminate Servers without credit routine completed successfully.');
        } catch (error) {
            console.error('Error during Terminate Servers without credit routine:', error);
            await dependencies.eventLogger.log({
                eventMessage: `Error during Terminate Servers without credit routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}