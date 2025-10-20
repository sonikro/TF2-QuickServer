import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { DeleteServerTaskProcessor } from './DeleteServerTaskProcessor';
import { DeleteServerForUser } from '../../core/usecase/DeleteServerForUser';

describe('DeleteServerTaskProcessor', () => {
  const makeSut = () => {
    const deleteServerForUser = mock<DeleteServerForUser>();
    const sut = new DeleteServerTaskProcessor({
      deleteServerForUser,
    });
    return { sut, deleteServerForUser };
  };

  it('should process a delete server task successfully', async () => {
    const { sut, deleteServerForUser } = makeSut();
    const userId = 'test-user-id';

    when(deleteServerForUser.execute).calledWith({ userId }).thenResolve(undefined);

    await sut.process({ userId });

    expect(deleteServerForUser.execute).toHaveBeenCalledWith({ userId });
  });

  it('should throw when delete server use case fails', async () => {
    const { sut, deleteServerForUser } = makeSut();
    const userId = 'test-user-id';
    const error = new Error('Deletion failed');

    when(deleteServerForUser.execute).calledWith({ userId }).thenReject(error);

    await expect(sut.process({ userId })).rejects.toThrow('Deletion failed');
  });
});
