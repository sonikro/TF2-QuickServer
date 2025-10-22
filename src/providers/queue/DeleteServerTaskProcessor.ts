import { GenericTaskProcessor } from './GenericTaskProcessor';
import { DeleteServer } from '../../core/usecase/DeleteServer';

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
