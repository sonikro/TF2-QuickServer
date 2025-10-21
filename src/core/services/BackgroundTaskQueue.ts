export interface BackgroundTask {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  callbacks?: BackgroundTaskCallbacks;
}

export interface BackgroundTaskProcessor<T = Record<string, unknown>> {
  process(data: T): Promise<unknown>;
}

export type BackgroundTaskCallbacks = {
  onSuccess?: (result: unknown) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
};

export interface BackgroundTaskQueue {
  enqueue<T extends Record<string, unknown>>(
    type: string,
    data: T,
    callbacks?: BackgroundTaskCallbacks
  ): Promise<string>;
  registerProcessor<T extends Record<string, unknown>>(
    type: string,
    processor: BackgroundTaskProcessor<T>
  ): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
