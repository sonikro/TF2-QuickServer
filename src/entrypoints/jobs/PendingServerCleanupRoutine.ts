import schedule from 'node-schedule';
import { TerminatePendingServers } from '../../core/usecase/TerminatePendingServers';
import { EventLogger } from '../../core/services/EventLogger';

// Schedule a job to run every 10 minutes
export const schedulePendingServerCleanupRoutine = (dependencies: {
    terminatePendingServers: TerminatePendingServers,
    eventLogger: EventLogger
}) => {
    schedule.scheduleJob('*/10 * * * *', async () => {
        try {
            console.log('Running Pending Server Cleanup Routine...');
            await dependencies.terminatePendingServers.execute();
            console.log('Pending Server Cleanup Routine completed successfully.');
        } catch (error) {
            console.error('Error during Pending Server Cleanup Routine:', error);
            await dependencies.eventLogger.log({
                eventMessage: `Error during Pending Server Cleanup Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}
