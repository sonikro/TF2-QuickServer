import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { GetServerStatsUseCase } from './GetServerStats';
import { ServerRepository } from '../repository/ServerRepository';
import { Server } from '../domain/DeployedServer';
import { Region } from '../domain/Region';

describe('GetServerStatsUseCase', () => {
  // Define the makeSut function
  function makeSut() {
    // Mock dependencies
    const serverRepositoryMock = mock<ServerRepository>();
    
    // Create SUT with mocked dependencies
    const sut = new GetServerStatsUseCase({
      serverRepository: serverRepositoryMock,
    });
    
    return {
      sut,
      serverRepositoryMock,
    };
  }

  it('should return server stats grouped by region', async () => {
    // Given
    const { sut, serverRepositoryMock } = makeSut();
    const mockServers: Server[] = [
      {
        serverId: 'server1',
        region: Region.US_CHICAGO_1,
        status: 'ready',
        variant: 'standard-competitive',
        hostIp: '127.0.0.1',
        hostPort: 27015,
        tvIp: '127.0.0.1',
        tvPort: 27020,
        rconPassword: 'test',
        rconAddress: '127.0.0.1:27015',
      },
      {
        serverId: 'server2',
        region: Region.US_CHICAGO_1,
        status: 'pending',
        variant: 'standard-competitive',
        hostIp: '127.0.0.1',
        hostPort: 27016,
        tvIp: '127.0.0.1',
        tvPort: 27021,
        rconPassword: 'test',
        rconAddress: '127.0.0.1:27016',
      },
      {
        serverId: 'server3',
        region: Region.EU_FRANKFURT_1,
        status: 'ready',
        variant: 'standard-competitive',
        hostIp: '127.0.0.1',
        hostPort: 27017,
        tvIp: '127.0.0.1',
        tvPort: 27022,
        rconPassword: 'test',
        rconAddress: '127.0.0.1:27017',
      },
    ];
    
    when(serverRepositoryMock.getAllServers).calledWith().thenResolve(mockServers);

    // When
    const result = await sut.execute();

    // Then
    expect(result.totalServers).toBe(3);
    expect(result.regions).toHaveLength(7); // All regions from the enum
    
    const chicagoStats = result.regions.find((r) => r.region === Region.US_CHICAGO_1);
    expect(chicagoStats).toBeDefined();
    expect(chicagoStats!.readyServers).toBe(1);
    expect(chicagoStats!.pendingServers).toBe(1);
    
    const frankfurtStats = result.regions.find((r) => r.region === Region.EU_FRANKFURT_1);
    expect(frankfurtStats).toBeDefined();
    expect(frankfurtStats!.readyServers).toBe(1);
    expect(frankfurtStats!.pendingServers).toBe(0);
  });

  it('should handle empty server list', async () => {
    // Given
    const { sut, serverRepositoryMock } = makeSut();
    when(serverRepositoryMock.getAllServers).calledWith().thenResolve([]);

    // When
    const result = await sut.execute();

    // Then
    expect(result.totalServers).toBe(0);
    expect(result.regions).toHaveLength(7); // All regions from the enum
    result.regions.forEach((region) => {
      expect(region.readyServers).toBe(0);
      expect(region.pendingServers).toBe(0);
    });
  });

  it('should throw error when repository fails', async () => {
    // Given
    const { sut, serverRepositoryMock } = makeSut();
    when(serverRepositoryMock.getAllServers).calledWith().thenReject(new Error('Database error'));

    // When & Then
    await expect(sut.execute()).rejects.toThrow('Failed to get server statistics. Database error');
  });
});