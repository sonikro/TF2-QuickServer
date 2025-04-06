import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeleteServerForUser } from "./DeleteServerForUser";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerManager } from "../services/ServerManager";
import { Region, Server } from "../domain";
import { Chance } from "chance";

const chance = new Chance();

describe("DeleteServerForUser", () => {
    const mockServerRepository = mock<ServerRepository>();
    const mockServerManager = mock<ServerManager>();

    const deleteServerForUser = new DeleteServerForUser({
        serverRepository: mockServerRepository,
        serverManager: mockServerManager,
    });

    const validArgs = {
        serverId: chance.guid(),
        userId: chance.guid(),
        region: chance.pickone(["us-east", "us-west", "eu-central"]) as Region,
    };

    beforeEach(() => {
        vi.resetAllMocks();
    })

    it("should throw an error if the server does not exist", async () => {
        when(mockServerRepository.findById).calledWith(validArgs.serverId).thenResolve(null);

        await expect(deleteServerForUser.execute(validArgs)).rejects.toThrow(
            `Server with ID ${validArgs.serverId} does not exist or does not belong to the user.`
        );

        expect(mockServerRepository.findById).toHaveBeenCalledWith(validArgs.serverId);
        expect(mockServerManager.deleteServer).not.toHaveBeenCalled();
        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("should throw an error if the server does not belong to the user", async () => {
        when(mockServerRepository.findById)
            .calledWith(validArgs.serverId)
            .thenResolve({
                id: validArgs.serverId,
                createdBy: chance.guid(), // Random user ID
            } as unknown as Server);

        await expect(deleteServerForUser.execute(validArgs)).rejects.toThrow(
            `Server with ID ${validArgs.serverId} does not exist or does not belong to the user.`
        );

        expect(mockServerRepository.findById).toHaveBeenCalledWith(validArgs.serverId);
        expect(mockServerManager.deleteServer).not.toHaveBeenCalled();
        expect(mockServerRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("should delete the server if it exists and belongs to the user", async () => {
        when(mockServerRepository.findById)
            .calledWith(validArgs.serverId)
            .thenResolve({
                id: validArgs.serverId,
                createdBy: validArgs.userId,
            } as unknown as Server); ;

        await deleteServerForUser.execute(validArgs);

        expect(mockServerManager.deleteServer).toHaveBeenCalledWith({
            region: validArgs.region,
            serverId: validArgs.serverId,
        });
        expect(mockServerRepository.deleteServer).toHaveBeenCalledWith(validArgs.serverId);
    });
});