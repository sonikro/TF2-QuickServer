import { logger } from '../../telemetry/otel';
import schedule from 'node-schedule';
import { TerminateLongRunningServers } from '../../core/usecase/TerminateLongRunningServers';
import { EventLogger } from '../../core/services/EventLogger';

export const scheduleTerminateLongRunningServerRoutine = (dependencies: {
    terminateLongRunningServers: TerminateLongRunningServers,
    eventLogger: EventLogger
}) => {
    schedule.scheduleJob('*/30 * * * *', async () => {
        try {
            logger.emit({ severityText: 'INFO', body: 'Running Terminate Long Running Server routine...' });
            await dependencies.terminateLongRunningServers.execute();
            logger.emit({ severityText: 'INFO', body: 'Terminate Long Running Server routine completed successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error during Terminate Long Running Server routine', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Terminate Long Running Server routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
};
