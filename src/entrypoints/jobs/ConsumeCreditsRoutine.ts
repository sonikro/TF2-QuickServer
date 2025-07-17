import { logger } from '../../telemetry/otel';
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
        logger.emit({ severityText: 'INFO', body: 'Consume Credits Routine is disabled in the configuration.' });
        return;
    }
    schedule.scheduleJob('* * * * *', async () => {
        try {
            logger.emit({ severityText: 'INFO', body: 'Running Consume Credits Routine...' });
            await dependencies.consumeCreditsFromRunningServers.execute()
            logger.emit({ severityText: 'INFO', body: 'Consume Credits Routine completed successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error during Consume Credits Routine', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Consume Credits Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    })
}