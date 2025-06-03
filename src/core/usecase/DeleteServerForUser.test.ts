import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Server } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
import { ServerManager } from "../services/ServerManager";
import { DeleteServerForUser } from "./DeleteServerForUser";

const chance = new Chance();

describe("DeleteServerForUser", () => {
    const mockServerRepository = mock<ServerRepository>();
    const mockServerManager = mock<ServerManager>();
    const mockEventLogger = mock<EventLogger>();
    const mockAbortManager = mock<ServerAbortManager>();

    const deleteServerForUser = new DeleteServerForUser({
        serverRepository: mockServerRepository,
        serverManager: mockServerManager,
        eventLogger: mockEventLogger,
        serverAbortManager: mockAbortManager,
    });

    const userId = chance.guid();

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should throw an error if the user has no servers", async () => {
        mockServerRepository.getAllServersByUserId.mockResolvedValue([]);

        await expect(deleteServerForUser.execute({ userId })).rejects.toThrow(
            "You don't have any servers to terminate."
        );

        expect(mockServerRepository.getAllServersByUserId).toHaveBeenCalledWith(userId);
        expect(mockServerManager.deleteServer).not.toHaveBeenCalled();
        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
        expect(mockEventLogger.log).not.toHaveBeenCalled();
    });

    it("should delete all servers and log events if servers exist", async () => {
        const servers: Server[] = mock([
            { serverId: chance.guid(), region: "us-east" },
            { serverId: chance.guid(), region: "eu-central" },
        ]);

        mockServerRepository.getAllServersByUserId.mockResolvedValue(servers);
        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();
        mockAbortManager.getOrCreate.mockReturnValue({ abort: vi.fn(), signal: {} } as any);

        await deleteServerForUser.execute({ userId });

        for (const server of servers) {
            expect(mockServerManager.deleteServer).toHaveBeenCalledWith({
                serverId: server.serverId,
                region: server.region,
            });
            expect(mockServerRepository.deleteServer).toHaveBeenCalledWith(server.serverId);
            expect(mockEventLogger.log).toHaveBeenCalledWith({
                eventMessage: `User deleted server with ID ${server.serverId} in region ${server.region}.`,
                actorId: userId,
            });
        }
    });

    it("should log and throw an error if any deletion fails", async () => {
        const servers: Server[] = mock([
            { serverId: chance.guid(), region: "us-east" },
            { serverId: chance.guid(), region: "eu-central" },
        ]);

        mockServerRepository.getAllServersByUserId.mockResolvedValue(servers);

        // One succeeds, one fails
        mockServerManager.deleteServer
            .mockResolvedValueOnce()
            .mockRejectedValueOnce(new Error("Failed to delete server"));

        mockServerRepository.deleteServer.mockResolvedValue();
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
        const servers: Server[] = mock([
            { serverId: chance.guid(), region: "us-east" },
            { serverId: chance.guid(), region: "eu-central" },
        ]);
        const abortControllers = servers.map(() => ({ abort: vi.fn(), signal: {} }));
        mockServerRepository.getAllServersByUserId.mockResolvedValue(servers);
        // Mock abort manager to return a different controller for each server
        mockAbortManager.getOrCreate
            .mockImplementationOnce(() => abortControllers[0] as any as AbortController)
            .mockImplementationOnce(() => abortControllers[1] as any as AbortController);
        mockServerManager.deleteServer.mockResolvedValue();
        mockServerRepository.deleteServer.mockResolvedValue();
        mockEventLogger.log.mockResolvedValue();

        await deleteServerForUser.execute({ userId });

        servers.forEach((server, index) => {
            expect(abortControllers[index].abort).toHaveBeenCalled();
            expect(mockAbortManager.delete).toHaveBeenCalledWith(server.serverId);
        })
    });
});
