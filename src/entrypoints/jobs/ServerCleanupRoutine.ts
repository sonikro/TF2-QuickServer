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
            console.log('Running Server Cleanup Routine...');
            await dependencies.terminateEmptyServers.execute();
            console.log('Server Cleanup Routine completed successfully.');
        } catch (error) {
            console.error('Error during Server Cleanup Routine:', error);
            await dependencies.eventLogger.log({
                eventMessage: `Error during Server Cleanup Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
}