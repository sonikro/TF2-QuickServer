import { logger } from '../../telemetry/otel';
import schedule from 'node-schedule';
import { TerminatePendingServers } from '../../core/usecase/TerminatePendingServers';
import { EventLogger } from '../../core/services/EventLogger';

// Schedule a job to run every 10 minutes
export const schedulePendingServerCleanupRoutine = (dependencies: {
    terminatePendingServers: TerminatePendingServers,
    eventLogger: EventLogger
}) => {
    schedule.scheduleJob('*/15 * * * *', async () => {
        try {
            logger.emit({ severityText: 'INFO', body: 'Running Pending Server Cleanup Routine...' });
            await dependencies.terminatePendingServers.execute();
            logger.emit({ severityText: 'INFO', body: 'Pending Server Cleanup Routine completed successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error during Pending Server Cleanup Routine', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Pending Server Cleanup Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}
