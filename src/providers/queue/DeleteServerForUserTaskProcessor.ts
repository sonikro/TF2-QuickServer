import { GenericTaskProcessor } from './GenericTaskProcessor';
import { DeleteServerForUser } from '../../core/usecase/DeleteServerForUser';

export type DeleteServerForUserTaskData = {
  userId: string;
};

export function createDeleteServerForUserTaskProcessor(
  deleteServerForUser: DeleteServerForUser
): GenericTaskProcessor<DeleteServerForUserTaskData> {
  return new GenericTaskProcessor({
    useCase: deleteServerForUser,
    taskName: 'delete-server-for-user',
  });
}
