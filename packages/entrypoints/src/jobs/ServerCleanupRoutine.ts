import { TerminateEmptyServers } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

// Schedule a job to run every minute
export const scheduleServerCleanupRoutine = (dependencies: {
    terminateEmptyServers: TerminateEmptyServers,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('* * * * *', 'Server Cleanup Routine', () =>
        dependencies.terminateEmptyServers.execute(),
        dependencies.eventLogger
    );
};
