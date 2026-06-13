import { TerminateLongRunningServers } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

export const scheduleTerminateLongRunningServerRoutine = (dependencies: {
    terminateLongRunningServers: TerminateLongRunningServers,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('*/30 * * * *', 'Terminate Long Running Server routine', () =>
        dependencies.terminateLongRunningServers.execute(),
        dependencies.eventLogger
    );
};
