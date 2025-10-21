import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { DeleteServerForUser } from '../../core/usecase/DeleteServerForUser';
import { createDeleteServerTaskProcessor } from './DeleteServerTaskProcessor';
import { GenericTaskProcessor } from './GenericTaskProcessor';

describe('createDeleteServerTaskProcessor', () => {
  const makeSut = () => {
    const deleteServerForUser = mock<DeleteServerForUser>();
    const sut = createDeleteServerTaskProcessor(deleteServerForUser);
    return { deleteServerForUser, sut };
  };

  it('should create a GenericTaskProcessor with correct dependencies', () => {
    const { sut } = makeSut();

    expect(sut).toBeInstanceOf(GenericTaskProcessor);
  });

  it('should process a delete server task successfully', async () => {
    const { deleteServerForUser, sut } = makeSut();
    const userId = 'test-user-id';

    when(deleteServerForUser.execute).calledWith({ userId }).thenResolve(undefined);

    await sut.process({ userId });

    expect(deleteServerForUser.execute).toHaveBeenCalledWith({ userId });
  });

  it('should throw when delete server use case fails', async () => {
    const { deleteServerForUser, sut } = makeSut();
    const userId = 'test-user-id';
    const error = new Error('Deletion failed');

    when(deleteServerForUser.execute).calledWith({ userId }).thenReject(error);

    await expect(sut.process({ userId })).rejects.toThrow('Deletion failed');
  });
});

