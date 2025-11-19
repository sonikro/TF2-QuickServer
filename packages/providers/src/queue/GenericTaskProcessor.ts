import { logger } from '@tf2qs/telemetry/src/otel';
import { BackgroundTaskProcessor } from '@tf2qs/core/src/services/BackgroundTaskQueue';

type UseCase<T> = {
  execute(data: T): Promise<unknown>;
};

type GenericTaskProcessorDependencies<T> = {
  useCase: UseCase<T>;
  taskName: string;
};

export class GenericTaskProcessor<T extends Record<string, unknown>>
  implements BackgroundTaskProcessor<T>
{
  constructor(
    private readonly dependencies: GenericTaskProcessorDependencies<T>
  ) {}

  async process(data: T): Promise<unknown> {
    const { useCase, taskName } = this.dependencies;

    try {
      logger.emit({
        severityText: 'INFO',
        body: `Starting ${taskName} task`,
        attributes: { taskName },
      });

      const result = await useCase.execute(data);

      logger.emit({
        severityText: 'INFO',
        body: `${taskName} task completed successfully`,
        attributes: { taskName },
      });

      return result;
    } catch (error) {
      logger.emit({
        severityText: 'ERROR',
        body: `${taskName} task failed`,
        attributes: {
          taskName,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
      });

      throw error;
    }
  }
}
