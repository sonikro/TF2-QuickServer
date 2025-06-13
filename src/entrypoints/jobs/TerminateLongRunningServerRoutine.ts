import schedule from 'node-schedule';
import { TerminateLongRunningServers } from '../../core/usecase/TerminateLongRunningServers';

export const scheduleTerminateLongRunningServerRoutine = (dependencies: {
    terminateLongRunningServers: TerminateLongRunningServers,
}) => {
    schedule.scheduleJob('*/30 * * * *', async () => {
        try {
            console.log('Running Terminate Long Running Server routine...');
            await dependencies.terminateLongRunningServers.execute();
            console.log('Terminate Long Running Server routine completed successfully.');
        } catch (error) {
            console.error('Error during Terminate Long Running Server routine:', error);
        }
    });
};
