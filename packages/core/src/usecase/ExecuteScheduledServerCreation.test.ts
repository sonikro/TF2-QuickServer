import { Client as DiscordClient, User, UserManager } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../domain/Region";
import { Server } from "../domain/DeployedServer";
import { ScheduledServer } from "../domain/ScheduledServer";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { UserError } from "../errors/UserError";
import { CreateServerForUser } from "./CreateServerForUser";
import { ExecuteScheduledServerCreation } from "./ExecuteScheduledServerCreation";

function createSchedule(overrides: Partial<ScheduledServer> = {}): ScheduledServer {
    return {
        id: "schedule-1",
        userId: "user-1",
        guildId: null,
        region: "sa-saopaulo-1" as Region,
        variant: "standard-competitive" as const,
        scheduledAt: new Date("2026-08-01T21:30:00Z"),
        triggerAt: new Date("2026-08-01T21:25:00Z"),
        status: "scheduled",
        serverId: null,
        timezone: "UTC",
        createdAt: new Date("2026-08-01T10:00:00Z"),
        updatedAt: new Date("2026-08-01T10:00:00Z"),
        ...overrides,
    };
}

function createServer(overrides: Partial<Server> = {}): Server {
    return {
        serverId: "server-1",
        region: "sa-saopaulo-1" as any,
        variant: "standard-competitive" as any,
        hostIp: "127.0.0.1",
        hostPort: 27015,
        tvIp: "127.0.0.1",
        tvPort: 27020,
        rconPassword: "rconpass",
        rconAddress: "127.0.0.1",
        createdAt: new Date(),
        createdBy: "user-1",
        status: "ready",
        ...overrides,
    };
}

describe("ExecuteScheduledServerCreation", () => {
    let scheduledServerRepository: ReturnType<typeof mock<ScheduledServerRepository>>;
    let createServerForUser: ReturnType<typeof mock<CreateServerForUser>>;
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let users: ReturnType<typeof mock<UserManager>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let serverMessageFormatter: ReturnType<typeof vi.fn>;
    let user: ReturnType<typeof mock<User>>;
    let sut: ExecuteScheduledServerCreation;

    beforeEach(() => {
        scheduledServerRepository = mock<ScheduledServerRepository>();
        createServerForUser = mock<CreateServerForUser>();
        users = mock<UserManager>();
        discordBot = mock<DiscordClient>({ users });
        eventLogger = mock<EventLogger>();
        serverMessageFormatter = vi.fn().mockReturnValue("connect 127.0.0.1:27015; password rconpass");
        user = mock<User>();

        users.fetch.mockResolvedValue(user);
        user.send.mockResolvedValue(undefined as any);
        scheduledServerRepository.findById.mockResolvedValue(null);

        sut = new ExecuteScheduledServerCreation({
            scheduledServerRepository,
            createServerForUser,
            discordBot,
            eventLogger,
            serverMessageFormatter,
        });
    });

    it("should send the being-created DM, create the server, mark it created, and DM the connection info", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        const server = createServer();
        let capturedStatusUpdater: ((message: string) => Promise<void>) | undefined;
        createServerForUser.execute.mockImplementation(async (args) => {
            capturedStatusUpdater = args.statusUpdater;
            return server;
        });

        // When
        await sut.execute({ scheduleId: "schedule-1" });

        // Then
        expect(scheduledServerRepository.findById).toHaveBeenCalledWith("schedule-1");
        expect(user.send).toHaveBeenCalledTimes(2);
        expect(user.send).toHaveBeenNthCalledWith(1, expect.stringContaining("being created"));
        expect(user.send).toHaveBeenNthCalledWith(2, "connect 127.0.0.1:27015; password rconpass");
        expect(createServerForUser.execute).toHaveBeenCalledWith({
            region: schedule.region,
            variantName: schedule.variant,
            creatorId: schedule.userId,
            guildId: undefined,
            statusUpdater: expect.any(Function),
        });
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("schedule-1", "created", "server-1", expect.any(Date));
        expect(serverMessageFormatter).toHaveBeenCalledWith(server);
        expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({ eventMessage: expect.stringContaining("created successfully") }));

        // The statusUpdater passed to createServerForUser must not send any DMs
        await capturedStatusUpdater!("🛡️ [1/5] Creating SHIELD Firewall...");
        expect(user.send).toHaveBeenCalledTimes(2);
    });

    it("should pass the schedule guildId to createServerForUser", async () => {
        // Given
        const schedule = createSchedule({ guildId: "guild-1" });
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        createServerForUser.execute.mockResolvedValue(createServer());

        // When
        await sut.execute({ scheduleId: "schedule-1" });

        // Then
        expect(createServerForUser.execute).toHaveBeenCalledWith(expect.objectContaining({ guildId: "guild-1" }));
    });

    it("should return without creating or DMing when the schedule is not found", async () => {
        // Given
        scheduledServerRepository.findById.mockResolvedValue(null);

        // When
        await sut.execute({ scheduleId: "missing-schedule" });

        // Then
        expect(createServerForUser.execute).not.toHaveBeenCalled();
        expect(scheduledServerRepository.markStatus).not.toHaveBeenCalled();
        expect(user.send).not.toHaveBeenCalled();
        expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({ eventMessage: expect.stringContaining("missing-schedule") }));
    });

    it("should mark the schedule failed and DM the reason when creation throws a UserError", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        createServerForUser.execute.mockRejectedValue(new UserError("User does not have a SteamID set."));

        // When
        await sut.execute({ scheduleId: "schedule-1" });

        // Then
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("schedule-1", "failed", undefined, expect.any(Date));
        expect(user.send).toHaveBeenCalledTimes(2);
        expect(user.send).toHaveBeenNthCalledWith(1, expect.stringContaining("being created"));
        expect(user.send).toHaveBeenNthCalledWith(2, "User does not have a SteamID set.");
        expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({ eventMessage: expect.stringContaining("creation failed") }));
    });

    it("should mark the schedule failed and DM a generic reason on unexpected errors", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        createServerForUser.execute.mockRejectedValue(new Error("boom"));

        // When
        await sut.execute({ scheduleId: "schedule-1" });

        // Then
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("schedule-1", "failed", undefined, expect.any(Date));
        expect(user.send).toHaveBeenCalledTimes(2);
        expect(user.send).toHaveBeenNthCalledWith(1, expect.stringContaining("being created"));
        expect(user.send).toHaveBeenNthCalledWith(2, "Your scheduled server could not be created due to an unexpected error.");
        expect(eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({ eventMessage: expect.stringContaining("creation failed") }));
    });

    it("should still mark the schedule created and resolve when DMs fail", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        createServerForUser.execute.mockResolvedValue(createServer());
        users.fetch.mockRejectedValue(new Error("Cannot send messages to this user"));

        // When
        await expect(sut.execute({ scheduleId: "schedule-1" })).resolves.toBeUndefined();

        // Then
        expect(createServerForUser.execute).toHaveBeenCalled();
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("schedule-1", "created", "server-1", expect.any(Date));
    });

    it("should propagate a markStatus failure instead of swallowing it", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findById.mockResolvedValue(schedule);
        createServerForUser.execute.mockRejectedValue(new Error("boom"));
        scheduledServerRepository.markStatus.mockRejectedValue(new Error("db down"));

        // When/Then — the rejection from markStatus inside the catch block surfaces to the
        // caller (the background task queue) rather than becoming an unhandled rejection
        await expect(sut.execute({ scheduleId: "schedule-1" })).rejects.toThrow("db down");
    });
});
