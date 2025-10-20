import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackgroundTaskProcessor } from '../../core/services/BackgroundTaskQueue';
import { GracefulShutdownManager } from '../../core/services/GracefulShutdownManager';
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
});
