import { GenericTaskProcessor } from './GenericTaskProcessor';
import { ExecuteScheduledServerCreation } from '@tf2qs/core';

export type CreateScheduledServerTaskData = {
  scheduleId: string;
};

export function createScheduledServerTaskProcessor(
  executeScheduledServerCreation: ExecuteScheduledServerCreation
): GenericTaskProcessor<CreateScheduledServerTaskData> {
  return new GenericTaskProcessor({
    useCase: executeScheduledServerCreation,
    taskName: 'create-scheduled-server',
  });
}
