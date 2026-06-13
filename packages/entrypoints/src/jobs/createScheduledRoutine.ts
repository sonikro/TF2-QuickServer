import { logger } from '@tf2qs/telemetry';
import schedule from 'node-schedule';
import { EventLogger } from '@tf2qs/core';

export function createScheduledRoutine(
    cronExpression: string,
    routineName: string,
    fn: () => Promise<void>,
    eventLogger: EventLogger
): void {
    schedule.scheduleJob(cronExpression, async () => {
        try {
            logger.emit({ severityText: 'INFO', body: `Running ${routineName}...` });
            await fn();
            logger.emit({ severityText: 'INFO', body: `${routineName} completed successfully.` });
        } catch (error) {
            logger.emit({
                severityText: 'ERROR',
                body: `Error during ${routineName}`,
                attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) },
            });
            await eventLogger.log({
                eventMessage: `Error during ${routineName}: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}
