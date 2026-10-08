import { CheckForTf2Update } from '@tf2qs/core';
import { EventLogger } from '@tf2qs/core';
import { createScheduledRoutine } from './createScheduledRoutine';

export const scheduleTf2UpdateCheckRoutine = (dependencies: {
    checkForTf2Update: CheckForTf2Update,
    eventLogger: EventLogger
}) => {
    createScheduledRoutine('*/5 * * * *', 'TF2 Update Check Routine', () =>
        dependencies.checkForTf2Update.execute().then(() => undefined),
        dependencies.eventLogger
    );
};
