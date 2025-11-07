import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { Region, Server } from '../domain';
import { ServerRepository } from '../repository/ServerRepository';
import { GetServerStatus } from './GetServerStatus';

vi.mock('../domain', async () => {
    const actual = await vi.importActual('../domain');
    return {
        ...actual,
        getRegionDisplayName: vi.fn((region: string) => {
            const displayNames: Record<string, string> = {
                [Region.SA_SAOPAULO_1]: "São Paulo",
                [Region.SA_BOGOTA_1]: "Bogotá",
                [Region.US_CHICAGO_1]: "Chicago",
                [Region.SA_SANTIAGO_1]: "Santiago",
                [Region.EU_FRANKFURT_1]: "Frankfurt",
                [Region.AP_SYDNEY_1]: "Sydney",
            };
            return displayNames[region as Region] || region;
        }),
        getRegions: vi.fn(() => [
            Region.SA_SAOPAULO_1,
            Region.SA_BOGOTA_1,
            Region.US_CHICAGO_1,
        ]),
    };
});

describe("GetServerStatus", () => {
    const makeSut = () => {
        const serverRepository = mock<ServerRepository>();
        const sut = new GetServerStatus({ serverRepository });
        return { sut, serverRepository };
    };

    it("should return server count per region and status", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        
        const servers: Server[] = [
            {
                serverId: "server-1",
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: "1.1.1.1",
                hostPort: 27015,
                tvIp: "1.1.1.1",
                tvPort: 32768,
                rconPassword: "pass",
                rconAddress: "1.1.1.1:27015",
                status: "ready",
            },
            {
                serverId: "server-2",
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: "1.1.1.2",
                hostPort: 27016,
                tvIp: "1.1.1.2",
                tvPort: 32769,
                rconPassword: "pass",
                rconAddress: "1.1.1.2:27016",
                status: "pending",
            },
            {
                serverId: "server-3",
                region: Region.SA_BOGOTA_1,
                variant: "standard-competitive",
                hostIp: "2.2.2.1",
                hostPort: 27015,
                tvIp: "2.2.2.1",
                tvPort: 32768,
                rconPassword: "pass",
                rconAddress: "2.2.2.1:27015",
                status: "ready",
            },
            {
                serverId: "server-4",
                region: Region.SA_BOGOTA_1,
                variant: "standard-competitive",
                hostIp: "2.2.2.2",
                hostPort: 27016,
                tvIp: "2.2.2.2",
                tvPort: 32769,
                rconPassword: "pass",
                rconAddress: "2.2.2.2:27016",
                status: "ready",
            },
            {
                serverId: "server-5",
                region: Region.SA_BOGOTA_1,
                variant: "standard-competitive",
                hostIp: "2.2.2.3",
                hostPort: 27017,
                tvIp: "2.2.2.3",
                tvPort: 32770,
                rconPassword: "pass",
                rconAddress: "2.2.2.3:27017",
                status: "terminating",
            },
        ];

        when(serverRepository.getAllServers).calledWith().thenResolve(servers);

        // When
        const result = await sut.execute();

        // Then
        expect(result).toHaveLength(3);
        
        const saoPauloSummary = result.find(s => s.region === Region.SA_SAOPAULO_1);
        expect(saoPauloSummary).toEqual({
            region: Region.SA_SAOPAULO_1,
            displayName: "São Paulo",
            servers: {
                ready: 1,
                pending: 1,
                terminating: 0,
                total: 2,
            }
        });

        const bogotaSummary = result.find(s => s.region === Region.SA_BOGOTA_1);
        expect(bogotaSummary).toEqual({
            region: Region.SA_BOGOTA_1,
            displayName: "Bogotá",
            servers: {
                ready: 2,
                pending: 0,
                terminating: 1,
                total: 3,
            }
        });

        const chicagoSummary = result.find(s => s.region === Region.US_CHICAGO_1);
        expect(chicagoSummary).toEqual({
            region: Region.US_CHICAGO_1,
            displayName: "Chicago",
            servers: {
                ready: 0,
                pending: 0,
                terminating: 0,
                total: 0,
            }
        });
    });

    it("should return zero servers for all regions when no servers exist", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        when(serverRepository.getAllServers).calledWith().thenResolve([]);

        // When
        const result = await sut.execute();

        // Then
        expect(result).toHaveLength(3);
        result.forEach(summary => {
            expect(summary.servers.total).toBe(0);
            expect(summary.servers.ready).toBe(0);
            expect(summary.servers.pending).toBe(0);
            expect(summary.servers.terminating).toBe(0);
        });
    });
});
