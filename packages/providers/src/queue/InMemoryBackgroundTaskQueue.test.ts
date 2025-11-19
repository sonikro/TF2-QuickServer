import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackgroundTaskProcessor } from '@tf2qs/core/src/services/BackgroundTaskQueue';
import { GracefulShutdownManager } from '@tf2qs/core/src/services/GracefulShutdownManager';
import { InMemoryBackgroundTaskQueue } from './InMemoryBackgroundTaskQueue';

describe('InMemoryBackgroundTaskQueue', () => {
  let sut: InMemoryBackgroundTaskQueue;
  let shutdownManager: GracefulShutdownManager;

  beforeEach(() => {
    vi.useFakeTimers();
    shutdownManager = mock<GracefulShutdownManager>();
    vi.mocked(shutdownManager.run).mockImplementation(async (action) => action());
    sut = new InMemoryBackgroundTaskQueue(shutdownManager);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enqueue', () => {
    it('should enqueue a task successfully', async () => {
      const taskId = await sut.enqueue('test-task', { data: 'test' });
      
      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task-/);
    });

    it('should return a unique task ID for each enqueued task', async () => {
      const taskId1 = await sut.enqueue('test-task', { data: 'test1' });
      const taskId2 = await sut.enqueue('test-task', { data: 'test2' });
      
      expect(taskId1).not.toEqual(taskId2);
    });
  });

  describe('registerProcessor', () => {
    it('should register a processor for a task type', () => {
      const processor = mock<BackgroundTaskProcessor>();
      
      expect(() => {
        sut.registerProcessor('test-task', processor);
      }).not.toThrow();
    });
  });

  describe('start and stop', () => {
    it('should start the queue', async () => {
      expect(sut.isRunning()).toBe(false);
      
      await sut.start();
      
      expect(sut.isRunning()).toBe(true);
    });

    it('should stop the queue', async () => {
      await sut.start();
      expect(sut.isRunning()).toBe(true);
      
      await sut.stop();
      
      expect(sut.isRunning()).toBe(false);
    });

    it('should not throw when starting an already running queue', async () => {
      await sut.start();
      
      expect(async () => {
        await sut.start();
      }).not.toThrow();
    });

    it('should not throw when stopping an already stopped queue', async () => {
      expect(async () => {
        await sut.stop();
      }).not.toThrow();
    });
  });

  describe('task processing', () => {
    it('should process an enqueued task', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockResolvedValue(undefined);
      
      sut.registerProcessor('test-task', processor);
      
      await sut.enqueue('test-task', { data: 'test' });
      await sut.start();
      
      await vi.advanceTimersByTimeAsync(2000);
      
      await sut.stop();
      
      expect(processor.process).toHaveBeenCalled();
    });

    it('should process multiple tasks in order', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockResolvedValue(undefined);
      
      sut.registerProcessor('test-task', processor);
      
      await sut.enqueue('test-task', { id: 1 });
      await sut.enqueue('test-task', { id: 2 });
      await sut.enqueue('test-task', { id: 3 });
      
      await sut.start();
      
      await vi.advanceTimersByTimeAsync(4000);
      
      await sut.stop();
      
      expect(processor.process).toHaveBeenCalledTimes(3);
    });

    it('should handle processor errors gracefully', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Processing failed'));
      
      sut.registerProcessor('test-task', processor);
      
      await sut.enqueue('test-task', { data: 'test' });
      await sut.start();
      
      await vi.advanceTimersByTimeAsync(2000);
      
      await sut.stop();
      
      expect(processor.process).toHaveBeenCalled();
    });

    it('should skip tasks with no registered processor', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockResolvedValue(undefined);
      
      sut.registerProcessor('registered-task', processor);
      
      await sut.enqueue('unregistered-task', { data: 'test' });
      await sut.start();
      
      await vi.advanceTimersByTimeAsync(2000);
      
      await sut.stop();
      
      expect(processor.process).not.toHaveBeenCalled();
    });
  });

  describe('graceful shutdown', () => {
    it('should track tasks with shutdown manager', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockResolvedValue(undefined);

      sut.registerProcessor('test-task', processor);
      await sut.start();
      await sut.enqueue('test-task', { data: 'test' });

      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(vi.mocked(shutdownManager.run)).toHaveBeenCalled();
    });

    it('should track all tasks with shutdown manager', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockResolvedValue(undefined);

      sut.registerProcessor('test-task', processor);
      await sut.start();

      await sut.enqueue('test-task', { id: 1 });
      await sut.enqueue('test-task', { id: 2 });
      await sut.enqueue('test-task', { id: 3 });

      await vi.advanceTimersByTimeAsync(4000);

      await sut.stop();

      expect(vi.mocked(shutdownManager.run)).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry mechanism', () => {
    it('should retry a failing task up to maxRetries times', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValueOnce(new Error('First attempt failed'));
      processor.process.mockRejectedValueOnce(new Error('Second attempt failed'));
      processor.process.mockResolvedValueOnce(undefined);

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, undefined, { maxRetries: 2 });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(processor.process).toHaveBeenCalledTimes(3);
    });

    it('should not retry if maxRetries is 0', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Task failed'));
      const onError = vi.fn();

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, { onError }, { maxRetries: 0 });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(processor.process).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should call onError after exhausting retries', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Always fails'));
      const onError = vi.fn();

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, { onError }, { maxRetries: 2 });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(processor.process).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should use exponential backoff with default configuration', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Task failed'));

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, undefined, { maxRetries: 3 });
      await sut.start();

      await vi.advanceTimersByTimeAsync(1100);
      expect(processor.process).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1500);
      expect(processor.process).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(3000);
      expect(processor.process).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(7000);
      expect(processor.process).toHaveBeenCalledTimes(4);

      await sut.stop();
    });

    it('should use custom backoff configuration', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Task failed'));

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, undefined, {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 10000,
        backoffMultiplier: 3,
      });
      await sut.start();

      await vi.advanceTimersByTimeAsync(1100);
      expect(processor.process).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(processor.process).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(processor.process).toHaveBeenCalledTimes(3);

      await sut.stop();
    });

    it('should respect maxDelayMs in backoff calculation', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Task failed'));

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, undefined, {
        maxRetries: 3,
        initialDelayMs: 10000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);
      expect(processor.process).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5100);
      expect(processor.process).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5100);
      expect(processor.process).toHaveBeenCalledTimes(3);

      await sut.stop();
    });

    it('should call onSuccess after successful retry', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValueOnce(new Error('First attempt failed'));
      processor.process.mockResolvedValueOnce({ success: true });
      const onSuccess = vi.fn();

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, { onSuccess }, { maxRetries: 1 });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(processor.process).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith({ success: true });
    });

    it('should process retried tasks in order with other tasks', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      const results: string[] = [];

      let callCount = 0;
      processor.process.mockImplementation(async (data: Record<string, unknown>) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Task 1 fails first');
        }
        results.push(data.id as string);
      });

      sut.registerProcessor('test-task', processor);

      await sut.enqueue('test-task', { id: '1' }, undefined, { maxRetries: 1 });
      await sut.enqueue('test-task', { id: '2' });
      await sut.enqueue('test-task', { id: '3' });

      await sut.start();

      await vi.advanceTimersByTimeAsync(3500);
      expect(results).toEqual(['2', '3']);

      await vi.advanceTimersByTimeAsync(1500);
      expect(results).toEqual(['2', '3', '1']);

      await sut.stop();
    });

    it('should not retry if no retryConfig is provided', async () => {
      const processor = mock<BackgroundTaskProcessor>();
      processor.process.mockRejectedValue(new Error('Task failed'));
      const onError = vi.fn();

      sut.registerProcessor('test-task', processor);
      await sut.enqueue('test-task', { data: 'test' }, { onError });
      await sut.start();

      await vi.advanceTimersByTimeAsync(2000);

      await sut.stop();

      expect(processor.process).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledOnce();
    });
  });
});
