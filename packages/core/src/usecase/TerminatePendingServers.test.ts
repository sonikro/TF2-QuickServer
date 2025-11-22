import { Client as DiscordClient, User } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server } from "../domain/DeployedServer";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManager } from "../services/ServerManager";
import { ServerManagerFactory } from '@tf2qs/providers';
import { TerminatePendingServers } from "./TerminatePendingServers";

function createServer(overrides: Partial<Server> = {}): Server {
    return {
        serverId: "server-id-1",
        region: "us-east-1" as any,
        variant: "standard-competitive" as any,
        hostIp: "127.0.0.1",
        hostPort: 27015,
        tvIp: "127.0.0.1",
        tvPort: 27020,
        rconPassword: "rconpass",
        rconAddress: "127.0.0.1",
        createdAt: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago
        createdBy: "user-id-1",
        status: "pending",
        ...overrides
    };
}

describe("TerminatePendingServers", () => {
    let serverManager: ReturnType<typeof mock<ServerManager>>;
    let serverManagerFactory: ReturnType<typeof mock<ServerManagerFactory>>;
    let serverRepository: ReturnType<typeof mock<ServerRepository>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let user: ReturnType<typeof mock<User>>;
    let sut: TerminatePendingServers;

    beforeEach(() => {
        serverManager = mock<ServerManager>();
        serverManagerFactory = mock<ServerManagerFactory>();
        serverRepository = mock<ServerRepository>();
        eventLogger = mock<EventLogger>();
        discordBot = mock<DiscordClient>({ users: mock() });
        user = mock<User>();
        
        // Configure the factory to return the mocked server manager
        when(serverManagerFactory.createServerManager).calledWith(expect.any(String)).thenReturn(serverManager);
        
        sut = new TerminatePendingServers({
            serverManagerFactory,
            serverRepository,
            eventLogger,
            discordBot
        });
    });

    it("terminates servers stuck in pending for more than 10 minutes and notifies user", async () => {
        const pendingServer = createServer();
        serverRepository.getAllServers.mockResolvedValue([pendingServer]);
        (discordBot.users as any).fetch.mockResolvedValue(user);

        await sut.execute();

        expect(serverManager.deleteServer).toHaveBeenCalledWith({
            region: pendingServer.region,
            serverId: pendingServer.serverId,
        });
        expect(serverRepository.deleteServer).toHaveBeenCalledWith(pendingServer.serverId);
        expect(eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining(pendingServer.serverId),
            actorId: pendingServer.createdBy,
        });
        expect(user.send).toHaveBeenCalledWith(
            expect.stringContaining(pendingServer.serverId)
        );
    });

    it("does not terminate servers pending for less than 10 minutes", async () => {
        const recentPendingServer = createServer({ createdAt: new Date(Date.now() - 5 * 60 * 1000) });
        serverRepository.getAllServers.mockResolvedValue([recentPendingServer]);

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        expect(eventLogger.log).not.toHaveBeenCalled();
    });

    it("does not terminate servers not in pending status", async () => {
        const readyServer = createServer({ status: "ready" });
        serverRepository.getAllServers.mockResolvedValue([readyServer]);

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        expect(eventLogger.log).not.toHaveBeenCalled();
    });

    it("deletes server record and logs event if error is 'No container instance found'", async () => {
        const pendingServer = createServer();
        serverRepository.getAllServers.mockResolvedValue([pendingServer]);
        const error = new Error("No container instance found");
        serverManager.deleteServer.mockRejectedValue(error);

        await sut.execute();

        expect(serverRepository.deleteServer).toHaveBeenCalledWith(pendingServer.serverId);
        expect(eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining(pendingServer.serverId),
            actorId: pendingServer.createdBy,
        });
    });

    it("throws if any server termination fails with an unhandled error", async () => {
        const pendingServer = createServer();
        serverRepository.getAllServers.mockResolvedValue([pendingServer]);
        serverManager.deleteServer.mockRejectedValue(new Error("fail"));

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail");
        expect(serverManager.deleteServer).toHaveBeenCalled();
    });

    it("throws if one of multiple server terminations fails", async () => {
        const server1 = createServer({ serverId: "server-1" });
        const server2 = createServer({ serverId: "server-2" });
        serverRepository.getAllServers.mockResolvedValue([server1, server2]);
        serverManager.deleteServer.mockImplementation(async ({ serverId }) => {
            if (serverId === "server-2") throw new Error("fail-2");
        });
        (discordBot.users as any).fetch.mockResolvedValue(user);

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail-2");
        expect(serverManager.deleteServer).toHaveBeenCalledTimes(2);
    });
});
