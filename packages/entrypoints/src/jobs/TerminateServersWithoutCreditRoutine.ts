import { logger } from '@tf2qs/telemetry/src/otel';
import schedule from 'node-schedule';
import { TerminateServersWithoutCredit } from '@tf2qs/core/src/usecase/TerminateServersWithoutCredit';
import { ConfigManager } from '@tf2qs/core/src/utils/ConfigManager';
import { EventLogger } from '@tf2qs/core/src/services/EventLogger';

// Schedule a job to run every minute
export const scheduleTerminateServersWithoutCreditRoutine = (dependencies: {
    terminateServersWithoutCredit: TerminateServersWithoutCredit,
    configManager: ConfigManager,
    eventLogger: EventLogger
}) => {
    const creditsConfig = dependencies.configManager.getCreditsConfig();
    if (!creditsConfig.enabled) {
        logger.emit({ severityText: 'INFO', body: 'Terminate Servers without credit Routine is disabled in the configuration.' });
        return;
    }
    schedule.scheduleJob('* * * * *', async () => {
        try {
            logger.emit({ severityText: 'INFO', body: 'Running Terminate Servers without credit routine...' });
            await dependencies.terminateServersWithoutCredit.execute()
            logger.emit({ severityText: 'INFO', body: 'Terminate Servers without credit routine completed successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error during Terminate Servers without credit routine', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Terminate Servers without credit routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}