import { logger } from '../../telemetry/otel';
import { BackgroundTask, BackgroundTaskQueue, BackgroundTaskProcessor, BackgroundTaskCallbacks, BackgroundTaskRetryConfig } from '../../core/services/BackgroundTaskQueue';
import { GracefulShutdownManager } from '../../core/services/GracefulShutdownManager';

export class InMemoryBackgroundTaskQueue implements BackgroundTaskQueue {
  private tasks: BackgroundTask[] = [];
  private processors: Map<string, BackgroundTaskProcessor> = new Map();
  private running = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly processingDelayMs = 1000;
  private readonly defaultRetryConfig: Required<BackgroundTaskRetryConfig> = {
    maxRetries: 0,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  };

  constructor(private readonly shutdownManager: GracefulShutdownManager) {}

  registerProcessor<T extends Record<string, unknown>>(
    type: string,
    processor: BackgroundTaskProcessor<T>
  ): void {
    this.processors.set(type, processor);
  }

  async enqueue<T extends Record<string, unknown>>(
    type: string,
    data: T,
    callbacks?: BackgroundTaskCallbacks,
    retryConfig?: BackgroundTaskRetryConfig
  ): Promise<string> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mergedRetryConfig = retryConfig ? { ...this.defaultRetryConfig, ...retryConfig } : undefined;
    const task: BackgroundTask = {
      id,
      type,
      data,
      createdAt: new Date(),
      callbacks,
      retryConfig: mergedRetryConfig,
      currentRetryAttempt: 0,
      scheduledAt: new Date(),
    };

    this.tasks.push(task);

    logger.emit({
      severityText: 'INFO',
      body: 'Background task enqueued',
      attributes: {
        taskId: id,
        taskType: type,
        maxRetries: mergedRetryConfig?.maxRetries ?? 0,
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

    const now = new Date();
    const readyTaskIndex = this.tasks.findIndex((task) => !task.scheduledAt || task.scheduledAt <= now);

    if (readyTaskIndex === -1) {
      return;
    }

    const task = this.tasks.splice(readyTaskIndex, 1)[0];
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
      await this.shutdownManager.run(async () => {
        logger.emit({
          severityText: 'DEBUG',
          body: 'Processing background task',
          attributes: {
            taskId: task.id,
            taskType: task.type,
            attempt: (task.currentRetryAttempt ?? 0) + 1,
            maxRetries: task.retryConfig?.maxRetries ?? 0,
          },
        });

        const result = await processor.process(task.data);

        logger.emit({
          severityText: 'INFO',
          body: 'Background task completed successfully',
          attributes: {
            taskId: task.id,
            taskType: task.type,
            attempt: (task.currentRetryAttempt ?? 0) + 1,
          },
        });

        if (task.callbacks?.onSuccess) {
          await task.callbacks.onSuccess(result);
        }
      });
    } catch (error) {
      const currentAttempt = task.currentRetryAttempt ?? 0;
      const maxRetries = task.retryConfig?.maxRetries ?? 0;
      const shouldRetry = currentAttempt < maxRetries;

      logger.emit({
        severityText: 'ERROR',
        body: `Background task failed${shouldRetry ? ', will retry' : ''}`,
        attributes: {
          taskId: task.id,
          taskType: task.type,
          attempt: currentAttempt + 1,
          maxRetries,
          shouldRetry,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
      });

      if (shouldRetry) {
        this.scheduleRetry(task, currentAttempt + 1);
      } else {
        if (task.callbacks?.onError) {
          await task.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }

  private scheduleRetry(task: BackgroundTask, nextAttempt: number): void {
    const config = task.retryConfig;
    if (!config) {
      return;
    }

    const mergedConfig: Required<BackgroundTaskRetryConfig> = {
      maxRetries: config.maxRetries,
      initialDelayMs: config.initialDelayMs ?? this.defaultRetryConfig.initialDelayMs,
      maxDelayMs: config.maxDelayMs ?? this.defaultRetryConfig.maxDelayMs,
      backoffMultiplier: config.backoffMultiplier ?? this.defaultRetryConfig.backoffMultiplier,
    };

    const delay = this.calculateBackoffDelay(nextAttempt, mergedConfig);
    const scheduledAt = new Date(Date.now() + delay);

    task.currentRetryAttempt = nextAttempt;
    task.scheduledAt = scheduledAt;

    this.tasks.push(task);

    logger.emit({
      severityText: 'INFO',
      body: 'Background task scheduled for retry',
      attributes: {
        taskId: task.id,
        taskType: task.type,
        nextAttempt,
        delayMs: delay,
      },
    });
  }

  private calculateBackoffDelay(
    attemptNumber: number,
    config: Required<BackgroundTaskRetryConfig>
  ): number {
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    return Math.min(exponentialDelay, config.maxDelayMs);
  }
}
