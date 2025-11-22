import { Chance } from "chance";
import { Knex } from "knex";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ServerManagerFactory } from '@tf2qs/providers';
import { Region, Server } from "../domain";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManager } from "../services/ServerManager";
import { DeleteServer } from "./DeleteServer";

const chance = new Chance();

describe("DeleteServer", () => {
    const mockServerRepository = mock<ServerRepository>();
    const mockServerActivityRepository = mock<ServerActivityRepository>();
    const mockServerManager = mock<ServerManager>();
    const mockServerManagerFactory = mock<ServerManagerFactory>();
    const mockEventLogger = mock<EventLogger>();
    const mockAbortManager = mock<ServerAbortManager>();

    const mockTransaction = mock<Knex.Transaction>();

    const deleteServer = new DeleteServer({
        serverRepository: mockServerRepository,
        serverActivityRepository: mockServerActivityRepository,
        serverManagerFactory: mockServerManagerFactory,
        eventLogger: mockEventLogger,
        serverAbortManager: mockAbortManager,
    });

    const serverId = chance.guid();

    beforeEach(() => {
        vi.resetAllMocks();
        mockServerManagerFactory.createServerManager.mockReturnValue(mockServerManager);
        mockServerRepository.runInTransaction.mockImplementation(async (callback) => {
            return await callback(mockTransaction);
        });
    });

    it("should throw an error if the server does not exist", async () => {
        mockServerRepository.findById.mockResolvedValue(null);

        await expect(deleteServer.execute({ serverId })).rejects.toThrow("Server not found.");

        expect(mockServerRepository.findById).toHaveBeenCalledWith(serverId, mockTransaction);
        expect(mockServerManager.deleteServer).not.toHaveBeenCalled();
    });

    it("should delete a server successfully", async () => {
        const server: Server = {
            serverId,
            region: Region.US_CHICAGO_1,
            variant: "pugs" as any,
            hostIp: "1.1.1.1",
            hostPort: 27015,
            tvIp: "1.1.1.1",
            tvPort: 27020,
            rconPassword: "test",
            rconAddress: "1.1.1.1:27015",
            status: "ready" as any,
            createdBy: chance.guid(),
        };

        const terminatingServer = { ...server, status: "terminating" as any };

        mockServerRepository.findById
            .mockResolvedValueOnce(server)
            .mockResolvedValueOnce(terminatingServer)
            .mockResolvedValueOnce(terminatingServer);

        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue({ abort: vi.fn(), signal: {} } as any);

        await deleteServer.execute({ serverId });

        expect(mockServerManager.deleteServer).toHaveBeenCalledWith({
            serverId,
            region: server.region,
        });
        expect(mockServerRepository.deleteServer).toHaveBeenCalledWith(serverId, mockTransaction);
        expect(mockServerActivityRepository.deleteById).toHaveBeenCalledWith(serverId, mockTransaction);
        expect(mockEventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining(serverId),
            actorId: server.createdBy,
        });
    });

    it("should handle the case when server is deleted during transaction", async () => {
        const server: Server = {
            serverId,
            region: Region.US_CHICAGO_1,
            variant: "pugs" as any,
            hostIp: "1.1.1.1",
            hostPort: 27015,
            tvIp: "1.1.1.1",
            tvPort: 27020,
            rconPassword: "test",
            rconAddress: "1.1.1.1:27015",
            status: "ready" as any,
            createdBy: chance.guid(),
        };

        mockServerRepository.findById
            .mockResolvedValueOnce(server)
            .mockResolvedValueOnce(null);

        mockServerManager.deleteServer.mockResolvedValue();

        await deleteServer.execute({ serverId });

        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
        expect(mockServerActivityRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should abort ongoing signals before deleting", async () => {
        const server: Server = {
            serverId,
            region: Region.US_CHICAGO_1,
            variant: "pugs" as any,
            hostIp: "1.1.1.1",
            hostPort: 27015,
            tvIp: "1.1.1.1",
            tvPort: 27020,
            rconPassword: "test",
            rconAddress: "1.1.1.1:27015",
            status: "ready" as any,
            createdBy: chance.guid(),
        };

        const terminatingServer = { ...server, status: "terminating" as any };
        const abortController = { abort: vi.fn(), signal: {} };

        mockServerRepository.findById
            .mockResolvedValueOnce(server)
            .mockResolvedValueOnce(terminatingServer)
            .mockResolvedValueOnce(terminatingServer);

        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockServerRepository.upsertServer.mockResolvedValue();
        mockServerActivityRepository.deleteById.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue(abortController as any);

        await deleteServer.execute({ serverId });

        expect(abortController.abort).toHaveBeenCalled();
        expect(mockAbortManager.delete).toHaveBeenCalledWith(serverId);
    });

    it("should throw an error if server deletion fails", async () => {
        const server: Server = {
            serverId,
            region: Region.US_CHICAGO_1,
            variant: "pugs" as any,
            hostIp: "1.1.1.1",
            hostPort: 27015,
            tvIp: "1.1.1.1",
            tvPort: 27020,
            rconPassword: "test",
            rconAddress: "1.1.1.1:27015",
            status: "ready" as any,
            createdBy: chance.guid(),
        };

        const terminatingServer = { ...server, status: "terminating" as any };
        const error = new Error("Failed to delete from provider");

        mockServerRepository.findById
            .mockResolvedValueOnce(server)
            .mockResolvedValueOnce(terminatingServer);

        mockServerManager.deleteServer.mockRejectedValue(error);

        await expect(deleteServer.execute({ serverId })).rejects.toThrow("Failed to delete from provider");

        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
    });
});
