import { logger } from '../../telemetry/otel';
import { BackgroundTaskProcessor } from '../../core/services/BackgroundTaskQueue';
import { DeleteServerForUser } from '../../core/usecase/DeleteServerForUser';

export type DeleteServerTaskData = {
  userId: string;
};

export class DeleteServerTaskProcessor implements BackgroundTaskProcessor<DeleteServerTaskData> {
  constructor(
    private readonly dependencies: {
      deleteServerForUser: DeleteServerForUser;
    }
  ) {}

  async process(data: DeleteServerTaskData): Promise<void> {
    const { deleteServerForUser } = this.dependencies;
    const { userId } = data;

    try {
      logger.emit({
        severityText: 'INFO',
        body: 'Starting server deletion task',
        attributes: { userId },
      });

      await deleteServerForUser.execute({ userId });

      logger.emit({
        severityText: 'INFO',
        body: 'Server deletion task completed successfully',
        attributes: { userId },
      });
    } catch (error) {
      logger.emit({
        severityText: 'ERROR',
        body: 'Server deletion task failed',
        attributes: {
          userId,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
      });

      throw error;
    }
  }
}
