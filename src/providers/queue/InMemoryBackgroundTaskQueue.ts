import { logger } from '../../telemetry/otel';
import { BackgroundTask, BackgroundTaskQueue, BackgroundTaskProcessor } from '../../core/services/BackgroundTaskQueue';
import { GracefulShutdownManager } from '../../core/services/GracefulShutdownManager';

export class InMemoryBackgroundTaskQueue implements BackgroundTaskQueue {
  private tasks: BackgroundTask[] = [];
  private processors: Map<string, BackgroundTaskProcessor> = new Map();
  private running = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly processingDelayMs = 1000;

  constructor(private readonly shutdownManager: GracefulShutdownManager) {}

  registerProcessor<T extends Record<string, unknown>>(
    type: string,
    processor: BackgroundTaskProcessor<T>
  ): void {
    this.processors.set(type, processor);
  }

  async enqueue<T extends Record<string, unknown>>(
    type: string,
    data: T
  ): Promise<string> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: BackgroundTask = {
      id,
      type,
      data,
      createdAt: new Date(),
    };

    this.tasks.push(task);

    logger.emit({
      severityText: 'INFO',
      body: 'Background task enqueued',
      attributes: {
        taskId: id,
        taskType: type,
      },
    });

    return id;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.emit({
      severityText: 'INFO',
      body: 'Background task queue started',
    });

    this.processingInterval = setInterval(async () => {
      await this.processTasks();
    }, this.processingDelayMs);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.emit({
      severityText: 'INFO',
      body: 'Background task queue stopped',
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  private async processTasks(): Promise<void> {
    if (this.tasks.length === 0) {
      return;
    }

    const task = this.tasks.shift();
    if (!task) {
      return;
    }

    const processor = this.processors.get(task.type);
    if (!processor) {
      logger.emit({
        severityText: 'WARN',
        body: 'No processor found for background task type',
        attributes: {
          taskId: task.id,
          taskType: task.type,
        },
      });
      return;
    }

    try {
      // Wrap task processing with graceful shutdown manager
      await this.shutdownManager.run(async () => {
        logger.emit({
          severityText: 'DEBUG',
          body: 'Processing background task',
          attributes: {
            taskId: task.id,
            taskType: task.type,
          },
        });

        await processor.process(task.data);

        logger.emit({
          severityText: 'INFO',
          body: 'Background task completed successfully',
          attributes: {
            taskId: task.id,
            taskType: task.type,
          },
        });
      });
    } catch (error) {
      logger.emit({
        severityText: 'ERROR',
        body: 'Background task failed',
        attributes: {
          taskId: task.id,
          taskType: task.type,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
      });
    }
  }
}
