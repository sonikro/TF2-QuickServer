import { GenericTaskProcessor } from './GenericTaskProcessor';
import { DeleteServerForUser } from '../../core/usecase/DeleteServerForUser';

export type DeleteServerTaskData = {
  userId: string;
};

export function createDeleteServerTaskProcessor(
  deleteServerForUser: DeleteServerForUser
): GenericTaskProcessor<DeleteServerTaskData> {
  return new GenericTaskProcessor({
    useCase: deleteServerForUser,
    taskName: 'delete-server',
  });
}
