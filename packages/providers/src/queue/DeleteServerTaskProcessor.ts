import { GenericTaskProcessor } from './GenericTaskProcessor';
import { DeleteServer } from '@tf2qs/core';

export type DeleteServerTaskData = {
  serverId: string;
};

export function createDeleteServerTaskProcessor(
  deleteServer: DeleteServer
): GenericTaskProcessor<DeleteServerTaskData> {
  return new GenericTaskProcessor({
    useCase: deleteServer,
    taskName: 'delete-server',
  });
}
