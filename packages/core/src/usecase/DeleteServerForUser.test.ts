import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server, Region } from "../domain";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManager } from "../services/ServerManager";
import { ServerManagerFactory } from '@tf2qs/providers';
import { DeleteServerForUser } from "./DeleteServerForUser";
import { Knex } from "knex";

const chance = new Chance();

describe("DeleteServerForUser", () => {
    const mockServerRepository = mock<ServerRepository>();
    const mockServerActivityRepository = mock<ServerActivityRepository>();
    const mockServerManager = mock<ServerManager>();
    const mockServerManagerFactory = mock<ServerManagerFactory>();
    const mockEventLogger = mock<EventLogger>();
    const mockAbortManager = mock<ServerAbortManager>();

    // Create a mock transaction object to use consistently
    const mockTransaction = mock<Knex.Transaction>();

    const deleteServerForUser = new DeleteServerForUser({
        serverRepository: mockServerRepository,
        serverActivityRepository: mockServerActivityRepository,
        serverManagerFactory: mockServerManagerFactory,
        eventLogger: mockEventLogger,
        serverAbortManager: mockAbortManager,
    });

    const userId = chance.guid();

    beforeEach(() => {
        vi.resetAllMocks();
        // Configure the factory to return the mocked server manager for any Region
        mockServerManagerFactory.createServerManager.mockReturnValue(mockServerManager);
        // Mock runInTransaction to execute the callback function
        mockServerRepository.runInTransaction.mockImplementation(async (callback) => {
            return await callback(mockTransaction);
        });
    });

    it("should return without doing anything if the user has no servers", async () => {
        mockServerRepository.getAllServersByUserId.mockResolvedValue([]);

        await deleteServerForUser.execute({ userId });

        expect(mockServerRepository.getAllServersByUserId).toHaveBeenCalledWith(userId, mockTransaction);
        expect(mockServerManager.deleteServer).not.toHaveBeenCalled();
        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
        expect(mockEventLogger.log).not.toHaveBeenCalled();
    });

    it("should delete all servers and log events if servers exist", async () => {
        const servers: Server[] = [
            { 
                serverId: chance.guid(), 
                region: Region.US_CHICAGO_1,
                variant: "pugs" as any,
                hostIp: "1.1.1.1",
                hostPort: 27015,
                tvIp: "1.1.1.1",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "1.1.1.1:27015",
                status: "ready" as any
            },
            { 
                serverId: chance.guid(), 
                region: Region.EU_FRANKFURT_1,
                variant: "pugs" as any,
                hostIp: "2.2.2.2",
                hostPort: 27015,
                tvIp: "2.2.2.2",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "2.2.2.2:27015",
                status: "ready" as any
            },
        ];

        const terminatingServers = servers.map(s => ({ ...s, status: "terminating" as any }));

        mockServerRepository.getAllServersByUserId
            .mockResolvedValueOnce(servers)  // First call: mark as terminating
            .mockResolvedValueOnce(terminatingServers);  // Second call: get terminating servers
        
        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue({ abort: vi.fn(), signal: {} } as any);

        await deleteServerForUser.execute({ userId });

        for (const server of servers) {
            expect(mockServerManager.deleteServer).toHaveBeenCalledWith({
                serverId: server.serverId,
                region: server.region,
            });
            expect(mockServerRepository.deleteServer).toHaveBeenCalledWith(server.serverId, mockTransaction);
            expect(mockServerActivityRepository.deleteById).toHaveBeenCalledWith(server.serverId, mockTransaction);
            expect(mockEventLogger.log).toHaveBeenCalledWith({
                eventMessage: `User deleted server with ID ${server.serverId} in region ${server.region}.`,
                actorId: userId,
            });
        }
    });

    it("should log and throw an error if any deletion fails", async () => {
        const servers: Server[] = [
            { 
                serverId: chance.guid(), 
                region: Region.US_CHICAGO_1,
                variant: "pugs" as any,
                hostIp: "1.1.1.1",
                hostPort: 27015,
                tvIp: "1.1.1.1",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "1.1.1.1:27015",
                status: "ready" as any
            },
            { 
                serverId: chance.guid(), 
                region: Region.EU_FRANKFURT_1,
                variant: "pugs" as any,
                hostIp: "2.2.2.2",
                hostPort: 27015,
                tvIp: "2.2.2.2",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "2.2.2.2:27015",
                status: "ready" as any
            },
        ];

        const terminatingServers = servers.map(s => ({ ...s, status: "terminating" as any }));

        mockServerRepository.getAllServersByUserId
            .mockResolvedValueOnce(servers)  // First call: mark as terminating
            .mockResolvedValueOnce(terminatingServers);  // Second call: get terminating servers

        // One succeeds, one fails
        mockServerManager.deleteServer
            .mockResolvedValueOnce()
            .mockRejectedValueOnce(new Error("Failed to delete server"));

        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue({ abort: vi.fn(), signal: {} } as any);

        await expect(deleteServerForUser.execute({ userId })).rejects.toThrow(
            "Failed to delete some servers, please reach out to support."
        );

        expect(mockEventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining("Failed to delete some servers: Failed to delete server"),
            actorId: userId,
        });
    });

    it("should abort any ongoing signals to a server before deleting", async () => {
        const servers: Server[] = [
            { 
                serverId: chance.guid(), 
                region: Region.US_CHICAGO_1,
                variant: "pugs" as any,
                hostIp: "1.1.1.1",
                hostPort: 27015,
                tvIp: "1.1.1.1",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "1.1.1.1:27015",
                status: "ready" as any
            },
            { 
                serverId: chance.guid(), 
                region: Region.EU_FRANKFURT_1,
                variant: "pugs" as any,
                hostIp: "2.2.2.2",
                hostPort: 27015,
                tvIp: "2.2.2.2",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "2.2.2.2:27015",
                status: "ready" as any
            },
        ];
        const terminatingServers = servers.map(s => ({ ...s, status: "terminating" as any }));
        const abortControllers = servers.map(() => ({ abort: vi.fn(), signal: {} }));
        
        mockServerRepository.getAllServersByUserId
            .mockResolvedValueOnce(servers)  // First call: mark as terminating
            .mockResolvedValueOnce(terminatingServers);  // Second call: get terminating servers
        
        // Mock abort manager to return a different controller for each server deletion
        mockAbortManager.getOrCreate
            .mockReturnValueOnce(abortControllers[0] as any as AbortController)
            .mockReturnValueOnce(abortControllers[1] as any as AbortController);
            
        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();

        await deleteServerForUser.execute({ userId });

        servers.forEach((server, index) => {
            expect(abortControllers[index].abort).toHaveBeenCalled();
            expect(mockAbortManager.delete).toHaveBeenCalledWith(server.serverId);
        })
    });

    it("should delete pending servers when requested", async () => {
        const servers: Server[] = [
            { 
                serverId: chance.guid(), 
                region: Region.US_CHICAGO_1,
                variant: "pugs" as any,
                hostIp: "1.1.1.1",
                hostPort: 27015,
                tvIp: "1.1.1.1",
                tvPort: 27020,
                rconPassword: "test",
                rconAddress: "1.1.1.1:27015",
                status: "pending" as any
            },
        ];

        const terminatingServers = servers.map(s => ({ ...s, status: "terminating" as any }));

        mockServerRepository.getAllServersByUserId
            .mockResolvedValueOnce(servers)  // First call: mark as terminating
            .mockResolvedValueOnce(terminatingServers);  // Second call: get terminating servers
        
        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue({ abort: vi.fn(), signal: {} } as any);

        await deleteServerForUser.execute({ userId });

        expect(mockServerManager.deleteServer).toHaveBeenCalled();
        expect(mockServerRepository.deleteServer).toHaveBeenCalled();
        expect(mockEventLogger.log).toHaveBeenCalled();
    });
});
