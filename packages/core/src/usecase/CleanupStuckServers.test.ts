import { Client as DiscordClient, User } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server } from "../domain/DeployedServer";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerManager } from "../services/ServerManager";
import { ServerManagerFactory } from '@tf2qs/providers';
import { CleanupStuckServers } from "./CleanupStuckServers";

const STUCK_MS = 16 * 60 * 1000;
const FRESH_MS = 5 * 60 * 1000;

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
        createdAt: new Date(Date.now() - STUCK_MS),
        createdBy: "user-id-1",
        status: "pending",
        ...overrides
    };
}

describe("CleanupStuckServers", () => {
    let serverManager: ReturnType<typeof mock<ServerManager>>;
    let serverManagerFactory: ReturnType<typeof mock<ServerManagerFactory>>;
    let serverRepository: ReturnType<typeof mock<ServerRepository>>;
    let serverActivityRepository: ReturnType<typeof mock<ServerActivityRepository>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let user: ReturnType<typeof mock<User>>;
    let sut: CleanupStuckServers;

    const givenServers = (servers: { pending?: Server[], terminating?: Server[] }) => {
        serverRepository.getAllServers.mockImplementation(async (status?: string) => {
            if (status === "pending") return servers.pending ?? [];
            if (status === "terminating") return servers.terminating ?? [];
            return [];
        });
    };

    beforeEach(() => {
        serverManager = mock<ServerManager>();
        serverManagerFactory = mock<ServerManagerFactory>();
        serverRepository = mock<ServerRepository>();
        serverActivityRepository = mock<ServerActivityRepository>();
        eventLogger = mock<EventLogger>();
        discordBot = mock<DiscordClient>({ users: mock() });
        user = mock<User>();

        when(serverManagerFactory.createServerManager).calledWith(expect.anything()).thenReturn(serverManager);
        serverRepository.runInTransaction.mockImplementation(async (fn: any) => fn(mock()));
        givenServers({});
        (discordBot.users as any).fetch.mockResolvedValue(user);

        sut = new CleanupStuckServers({
            serverManagerFactory,
            serverRepository,
            serverActivityRepository,
            eventLogger,
            discordBot
        });
    });

    it("terminates servers stuck in pending for more than 15 minutes and notifies the creator", async () => {
        const pendingServer = createServer();
        givenServers({ pending: [pendingServer] });

        await sut.execute();

        expect(serverManager.deleteServer).toHaveBeenCalledWith({
            region: pendingServer.region,
            serverId: pendingServer.serverId,
        });
        expect(serverRepository.deleteServer).toHaveBeenCalledWith(pendingServer.serverId, expect.anything());
        expect(serverActivityRepository.deleteById).toHaveBeenCalledWith(pendingServer.serverId, expect.anything());
        expect(eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining(pendingServer.serverId),
            actorId: pendingServer.createdBy,
        });
        expect(user.send).toHaveBeenCalledWith(expect.stringContaining(pendingServer.serverId));
    });

    it("does not terminate servers pending for less than 15 minutes", async () => {
        givenServers({ pending: [createServer({ createdAt: new Date(Date.now() - FRESH_MS) })] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        expect(eventLogger.log).not.toHaveBeenCalled();
    });

    it("retries the termination of servers stuck in terminating for more than 15 minutes", async () => {
        const terminatingServer = createServer({ status: "terminating" });
        givenServers({ terminating: [terminatingServer] });

        await sut.execute();

        expect(serverManager.deleteServer).toHaveBeenCalledWith({
            region: terminatingServer.region,
            serverId: terminatingServer.serverId,
        });
        expect(serverRepository.deleteServer).toHaveBeenCalledWith(terminatingServer.serverId, expect.anything());
        expect(serverActivityRepository.deleteById).toHaveBeenCalledWith(terminatingServer.serverId, expect.anything());
        expect(eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining("terminating"),
            actorId: terminatingServer.createdBy,
        });
    });

    it("does not retry servers terminating for less than 15 minutes", async () => {
        givenServers({ terminating: [createServer({ status: "terminating", createdAt: new Date(Date.now() - FRESH_MS) })] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("deletes the server record when the cloud resource is already gone", async () => {
        const pendingServer = createServer();
        givenServers({ pending: [pendingServer] });
        serverManager.deleteServer.mockRejectedValue(new Error("No container instance found"));

        await sut.execute();

        expect(serverRepository.deleteServer).toHaveBeenCalledWith(pendingServer.serverId, expect.anything());
        expect(eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining(pendingServer.serverId),
            actorId: pendingServer.createdBy,
        });
    });

    it("deletes the record of a terminating server whose cloud resource is already gone", async () => {
        const terminatingServer = createServer({ status: "terminating" });
        givenServers({ terminating: [terminatingServer] });
        serverManager.deleteServer.mockRejectedValue(new Error("No container instance found"));

        await sut.execute();

        expect(serverRepository.deleteServer).toHaveBeenCalledWith(terminatingServer.serverId, expect.anything());
    });

    it("throws if a termination fails with an unhandled error", async () => {
        givenServers({ pending: [createServer()] });
        serverManager.deleteServer.mockRejectedValue(new Error("fail"));

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail");
    });

    it("throws if one of multiple terminations fails", async () => {
        givenServers({
            pending: [createServer({ serverId: "server-1" })],
            terminating: [createServer({ serverId: "server-2", status: "terminating" })],
        });
        serverManager.deleteServer.mockImplementation(async ({ serverId }: { serverId: string }) => {
            if (serverId === "server-2") throw new Error("fail-2");
        });

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail-2");
        expect(serverManager.deleteServer).toHaveBeenCalledTimes(2);
    });
});
