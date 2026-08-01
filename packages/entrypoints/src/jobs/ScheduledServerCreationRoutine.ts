import { ExecuteScheduledServers } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

// Schedule a job to run every minute
export const scheduleScheduledServerCreationRoutine = (dependencies: {
    executeScheduledServers: ExecuteScheduledServers,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('* * * * *', 'Scheduled Server Creation Routine', () =>
        dependencies.executeScheduledServers.execute(),
        dependencies.eventLogger
    );
};
