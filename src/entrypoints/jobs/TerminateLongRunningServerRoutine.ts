import schedule from 'node-schedule';
import { TerminateLongRunningServers } from '../../core/usecase/TerminateLongRunningServers';
import { EventLogger } from '../../core/services/EventLogger';

export const scheduleTerminateLongRunningServerRoutine = (dependencies: {
    terminateLongRunningServers: TerminateLongRunningServers,
    eventLogger: EventLogger
}) => {
    schedule.scheduleJob('*/30 * * * *', async () => {
        try {
            console.log('Running Terminate Long Running Server routine...');
            await dependencies.terminateLongRunningServers.execute();
            console.log('Terminate Long Running Server routine completed successfully.');
        } catch (error) {
            console.error('Error during Terminate Long Running Server routine:', error);
            await dependencies.eventLogger.log({
                eventMessage: `Error during Terminate Long Running Server routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: 'system',
            });
        }
    });
};
