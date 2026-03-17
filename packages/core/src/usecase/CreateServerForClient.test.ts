import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ServerRepository, ServerManagerFactory, ServerManager, IdGenerator } from '@tf2qs/core';
import { CreateServerForClient } from './CreateServerForClient';
import { Region, Server } from '../domain';

describe('CreateServerForClient', () => {
    function makeSut() {
        const serverRepository = mock<ServerRepository>();
        const serverManagerFactory = mock<ServerManagerFactory>();
        const serverManager = mock<ServerManager>();
        const idGenerator = mock<IdGenerator>();

        serverManagerFactory.createServerManager.mockReturnValue(serverManager);
        idGenerator.generate.mockReturnValue('mock-server-id');

        const sut = new CreateServerForClient({
            serverRepository,
            serverManagerFactory,
            idGenerator,
            eventLogger: mock(),
        });

        return { sut, serverRepository, serverManagerFactory, serverManager, idGenerator };
    }

    const baseArgs = {
        region: 'us-east-1' as Region,
        variantName: 'standard-competitive' as Server['variant'],
        clientId: 'client-abc123',
    };

    const deployedServer: Server = {
        serverId: 'server-xyz',
        region: 'us-east-1' as Region,
        variant: 'standard-competitive' as Server['variant'],
        hostIp: '1.2.3.4',
        hostPort: 27015,
        tvIp: '1.2.3.4',
        tvPort: 27020,
        rconPassword: 'rcon123',
        rconAddress: '1.2.3.4:27015',
    };

    describe('execute', () => {
        it('should create a server and return the deployed server', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When
            const result = await sut.execute(baseArgs);

            // Then
            expect(result).toEqual(deployedServer);
        });

        it('should use clientId as createdBy when upserting the server', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When
            await sut.execute(baseArgs);

            // Then
            expect(serverRepository.upsertServer).toHaveBeenCalledWith(
                expect.objectContaining({ createdBy: 'client-abc123', status: 'pending' })
            );
            expect(serverRepository.upsertServer).toHaveBeenCalledWith(
                expect.objectContaining({ createdBy: 'client-abc123', status: 'ready' })
            );
        });

        it('should pass extraEnvs to deployServer', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            const extraEnvs = { STV_TITLE: 'My Server', HOSTNAME: 'Pickup' };

            // When
            await sut.execute({ ...baseArgs, extraEnvs });

            // Then
            expect(serverManager.deployServer).toHaveBeenCalledWith(
                expect.objectContaining({ extraEnvs })
            );
        });

        it('should pass firstMap to deployServer when provided', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When
            await sut.execute({ ...baseArgs, firstMap: 'cp_process_f12' });

            // Then
            expect(serverManager.deployServer).toHaveBeenCalledWith(
                expect.objectContaining({ firstMap: 'cp_process_f12' })
            );
        });

        it('should pass empty extraEnvs to deployServer when not provided', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When
            await sut.execute(baseArgs);

            // Then
            expect(serverManager.deployServer).toHaveBeenCalledWith(
                expect.objectContaining({ extraEnvs: {} })
            );
        });

        it.each([
            { region: 'us-east-1', variantName: 'standard-competitive' },
            { region: 'eu-london', variantName: 'standard-competitive' },
            { region: 'sa-saopaulo-1', variantName: 'standard-competitive' },
        ])('should create server manager for region $region', async ({ region, variantName }) => {
            // Given
            const { sut, serverRepository, serverManagerFactory, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When
            await sut.execute({ clientId: 'client-abc123', region: region as Region, variantName: variantName as Server['variant'] });

            // Then
            expect(serverManagerFactory.createServerManager).toHaveBeenCalledWith(region);
        });

        it('should not enforce the 1-server-per-user restriction', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockResolvedValue(deployedServer);
            serverRepository.upsertServer.mockResolvedValue();

            // When - two servers created for the same clientId without error
            await sut.execute(baseArgs);
            await sut.execute(baseArgs);

            // Then - no exception thrown, and getAllServersByUserId never called
            expect(serverRepository.getAllServersByUserId).not.toHaveBeenCalled();
        });

        it('should propagate errors from deployServer', async () => {
            // Given
            const { sut, serverRepository, serverManager } = makeSut();
            serverManager.deployServer.mockRejectedValue(new Error('Cloud provider unavailable'));
            serverRepository.upsertServer.mockResolvedValue();

            // When / Then
            await expect(sut.execute(baseArgs)).rejects.toThrow('Cloud provider unavailable');
        });
    });
});
