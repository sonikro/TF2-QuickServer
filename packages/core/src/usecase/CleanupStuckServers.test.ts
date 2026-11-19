import { Client as DiscordClient, User } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server } from "../domain/DeployedServer";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { ServerRepository } from "../repository/ServerRepository";
import { EventLogger } from "../services/EventLogger";
import { ServerAbortManager } from "../services/ServerAbortManager";
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
    let serverAbortManager: ReturnType<typeof mock<ServerAbortManager>>;
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
        serverAbortManager = mock<ServerAbortManager>();
        eventLogger = mock<EventLogger>();
        discordBot = mock<DiscordClient>({ users: mock() });
        user = mock<User>();

        when(serverManagerFactory.createServerManager).calledWith(expect.anything()).thenReturn(serverManager);
        serverRepository.runInTransaction.mockImplementation(async (fn: any) => fn(mock()));
        serverAbortManager.has.mockReturnValue(false);
        serverAbortManager.getOrCreate.mockReturnValue(mock<AbortController>());
        givenServers({});
        (discordBot.users as any).fetch.mockResolvedValue(user);

        sut = new CleanupStuckServers({
            serverManagerFactory,
            serverRepository,
            serverActivityRepository,
            serverAbortManager,
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
        expect(serverAbortManager.getOrCreate(pendingServer.serverId).abort).toHaveBeenCalled();
        expect(user.send).toHaveBeenCalledWith(expect.stringContaining(pendingServer.serverId));
    });

    it("does not terminate servers pending for less than 15 minutes", async () => {
        givenServers({ pending: [createServer({ createdAt: new Date(Date.now() - FRESH_MS) })] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        expect(eventLogger.log).not.toHaveBeenCalled();
    });

    it("does not terminate a pending server whose deployment is still running", async () => {
        const pendingServer = createServer();
        givenServers({ pending: [pendingServer] });
        serverAbortManager.has.mockReturnValue(true);

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("retries the termination of servers stuck in terminating for more than 15 minutes", async () => {
        const terminatingServer = createServer({
            status: "terminating",
            terminatingAt: new Date(Date.now() - STUCK_MS),
        });
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

    it("does not retry a termination that started less than 15 minutes ago", async () => {
        const terminatingServer = createServer({
            status: "terminating",
            terminatingAt: new Date(Date.now() - FRESH_MS),
        });
        givenServers({ terminating: [terminatingServer] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("does not retry a termination that started recently on an old server", async () => {
        const terminatingServer = createServer({
            status: "terminating",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            terminatingAt: new Date(Date.now() - FRESH_MS),
        });
        givenServers({ terminating: [terminatingServer] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
    });

    it("skips terminating servers that have no termination timestamp", async () => {
        givenServers({ terminating: [createServer({ status: "terminating", terminatingAt: undefined })] });

        await sut.execute();

        expect(serverManager.deleteServer).not.toHaveBeenCalled();
    });

    it("keeps the record when the deletion fails with an unhandled error", async () => {
        givenServers({ pending: [createServer()] });
        serverManager.deleteServer.mockRejectedValue(new Error("fail"));

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail");
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        expect(serverActivityRepository.deleteById).not.toHaveBeenCalled();
        expect(eventLogger.log).not.toHaveBeenCalled();
    });

    it("keeps the record of a terminating server when the retried deletion fails", async () => {
        givenServers({ terminating: [createServer({ status: "terminating", terminatingAt: new Date(Date.now() - STUCK_MS) })] });
        serverManager.deleteServer.mockRejectedValue(new Error("fail"));

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail");
        expect(serverRepository.deleteServer).not.toHaveBeenCalled();
    });

    it("throws if one of multiple terminations fails", async () => {
        givenServers({
            pending: [createServer({ serverId: "server-1" })],
            terminating: [createServer({ serverId: "server-2", status: "terminating", terminatingAt: new Date(Date.now() - STUCK_MS) })],
        });
        serverManager.deleteServer.mockImplementation(async ({ serverId }: { serverId: string }) => {
            if (serverId === "server-2") throw new Error("fail-2");
        });

        await expect(sut.execute()).rejects.toThrow("One or more server terminations failed: Error: fail-2");
        expect(serverManager.deleteServer).toHaveBeenCalledTimes(2);
    });
});
