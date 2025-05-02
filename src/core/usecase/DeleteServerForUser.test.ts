import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManager } from "../services/ServerManager";
import { DeleteServerForUser } from "./DeleteServerForUser";
import { Server } from "../domain";

const chance = new Chance();

describe("DeleteServerForUser", () => {
    const mockServerRepository = mock<ServerRepository>();
    const mockServerManager = mock<ServerManager>();
    const mockEventLogger = mock<EventLogger>();

    const deleteServerForUser = new DeleteServerForUser({
        serverRepository: mockServerRepository,
        serverManager: mockServerManager,
        eventLogger: mockEventLogger,
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

        await expect(deleteServerForUser.execute({ userId })).rejects.toThrow(
            "Failed to delete some servers, please reach out to support."
        );

        expect(mockEventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining("Failed to delete some servers: Failed to delete server"),
            actorId: userId,
        });
    });
});
