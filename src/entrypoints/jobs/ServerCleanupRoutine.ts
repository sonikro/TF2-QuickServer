import { logger } from '../../telemetry/otel';
import schedule from 'node-schedule';
import { TerminateEmptyServers } from '../../core/usecase/TerminateEmptyServers';
import { EventLogger } from '../../core/services/EventLogger';

// Schedule a job to run every minute
export const scheduleServerCleanupRoutine = (dependencies: {
    terminateEmptyServers: TerminateEmptyServers,
    eventLogger: EventLogger
}) => {
    schedule.scheduleJob('* * * * *', async () => {
        try {
            logger.emit({ severityText: 'INFO', body: 'Running Server Cleanup Routine...' });
            await dependencies.terminateEmptyServers.execute();
            logger.emit({ severityText: 'INFO', body: 'Server Cleanup Routine completed successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error during Server Cleanup Routine', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Server Cleanup Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}