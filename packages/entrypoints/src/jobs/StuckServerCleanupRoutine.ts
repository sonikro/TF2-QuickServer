import { CleanupStuckServers } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

// Schedule a job to run every 15 minutes
export const scheduleStuckServerCleanupRoutine = (dependencies: {
    cleanupStuckServers: CleanupStuckServers,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('*/15 * * * *', 'Stuck Server Cleanup Routine', () =>
        dependencies.cleanupStuckServers.execute(),
        dependencies.eventLogger
    );
};
