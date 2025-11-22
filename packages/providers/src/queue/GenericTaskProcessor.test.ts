import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { GenericTaskProcessor } from './GenericTaskProcessor';

type TestTaskData = {
  userId: string;
  action: string;
};

describe('GenericTaskProcessor', () => {
  const makeSut = () => {
    const useCase = mock<{ execute(data: TestTaskData): Promise<void> }>();
    const sut = new GenericTaskProcessor({
      useCase,
      taskName: 'test-task',
    });
    return { sut, useCase };
  };

  it('should process a task successfully', async () => {
    const { sut, useCase } = makeSut();
    const data: TestTaskData = { userId: 'user-123', action: 'delete' };

    when(useCase.execute).calledWith(data).thenResolve(undefined);

    await sut.process(data);

    expect(useCase.execute).toHaveBeenCalledWith(data);
  });

  it('should throw when use case fails', async () => {
    const { sut, useCase } = makeSut();
    const data: TestTaskData = { userId: 'user-123', action: 'delete' };
    const error = new Error('Operation failed');

    when(useCase.execute).calledWith(data).thenReject(error);

    await expect(sut.process(data)).rejects.toThrow('Operation failed');
  });
});
