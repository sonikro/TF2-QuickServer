import { TerminatePendingServers } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

// Schedule a job to run every 15 minutes
export const schedulePendingServerCleanupRoutine = (dependencies: {
    terminatePendingServers: TerminatePendingServers,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('*/15 * * * *', 'Pending Server Cleanup Routine', () =>
        dependencies.terminatePendingServers.execute(),
        dependencies.eventLogger
    );
};
