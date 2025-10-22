import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { DeleteServer } from '../../core/usecase/DeleteServer';
import { createDeleteServerTaskProcessor } from './DeleteServerTaskProcessor';
import { GenericTaskProcessor } from './GenericTaskProcessor';

describe('createDeleteServerTaskProcessor', () => {
  const makeSut = () => {
    const deleteServer = mock<DeleteServer>();
    const sut = createDeleteServerTaskProcessor(deleteServer);
    return { deleteServer, sut };
  };

  it('should create a GenericTaskProcessor with correct dependencies', () => {
    const { sut } = makeSut();

    expect(sut).toBeInstanceOf(GenericTaskProcessor);
  });

  it('should process a delete server task successfully', async () => {
    const { deleteServer, sut } = makeSut();
    const serverId = 'test-server-id';

    when(deleteServer.execute).calledWith({ serverId }).thenResolve(undefined);

    await sut.process({ serverId });

    expect(deleteServer.execute).toHaveBeenCalledWith({ serverId });
  });

  it('should throw when delete server use case fails', async () => {
    const { deleteServer, sut } = makeSut();
    const serverId = 'test-server-id';
    const error = new Error('Deletion failed');

    when(deleteServer.execute).calledWith({ serverId }).thenReject(error);

    await expect(sut.process({ serverId })).rejects.toThrow('Deletion failed');
  });
});

