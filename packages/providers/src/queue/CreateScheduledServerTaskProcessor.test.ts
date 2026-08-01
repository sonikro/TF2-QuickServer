import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { ExecuteScheduledServerCreation } from '@tf2qs/core';
import { createScheduledServerTaskProcessor } from './CreateScheduledServerTaskProcessor';
import { GenericTaskProcessor } from './GenericTaskProcessor';

describe('createScheduledServerTaskProcessor', () => {
  const makeSut = () => {
    const executeScheduledServerCreation = mock<ExecuteScheduledServerCreation>();
    const sut = createScheduledServerTaskProcessor(executeScheduledServerCreation);
    return { executeScheduledServerCreation, sut };
  };

  it('should create a GenericTaskProcessor with correct dependencies', () => {
    const { sut } = makeSut();

    expect(sut).toBeInstanceOf(GenericTaskProcessor);
  });

  it('should process a create scheduled server task successfully', async () => {
    const { executeScheduledServerCreation, sut } = makeSut();
    const scheduleId = 'test-schedule-id';

    when(executeScheduledServerCreation.execute).calledWith({ scheduleId }).thenResolve(undefined);

    await sut.process({ scheduleId });

    expect(executeScheduledServerCreation.execute).toHaveBeenCalledWith({ scheduleId });
  });

  it('should throw when the create scheduled server use case fails', async () => {
    const { executeScheduledServerCreation, sut } = makeSut();
    const scheduleId = 'test-schedule-id';
    const error = new Error('Creation failed');

    when(executeScheduledServerCreation.execute).calledWith({ scheduleId }).thenReject(error);

    await expect(sut.process({ scheduleId })).rejects.toThrow('Creation failed');
  });
});
