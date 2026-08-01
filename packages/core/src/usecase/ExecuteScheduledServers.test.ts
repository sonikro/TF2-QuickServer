import { Client as DiscordClient, User, UserManager } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../domain/Region";
import { ScheduledServer } from "../domain/ScheduledServer";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { BackgroundTaskQueue } from "../services/BackgroundTaskQueue";
import { ExecuteScheduledServers } from "./ExecuteScheduledServers";

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

describe("ExecuteScheduledServers", () => {
    let scheduledServerRepository: ReturnType<typeof mock<ScheduledServerRepository>>;
    let backgroundTaskQueue: ReturnType<typeof mock<BackgroundTaskQueue>>;
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let user: ReturnType<typeof mock<User>>;
    let sut: ExecuteScheduledServers;

    beforeEach(() => {
        scheduledServerRepository = mock<ScheduledServerRepository>();
        backgroundTaskQueue = mock<BackgroundTaskQueue>();
        const users = mock<UserManager>();
        discordBot = mock<DiscordClient>({ users });
        eventLogger = mock<EventLogger>();
        user = mock<User>();

        users.fetch.mockResolvedValue(user);
        user.send.mockResolvedValue(undefined as any);
        scheduledServerRepository.findStuckCreating.mockResolvedValue([]);
        scheduledServerRepository.findDue.mockResolvedValue([]);

        sut = new ExecuteScheduledServers({
            scheduledServerRepository,
            backgroundTaskQueue,
            discordBot,
            eventLogger,
        });
    });

    it("should claim a due schedule and enqueue a create-scheduled-server task without blocking", async () => {
        // Given
        const schedule = createSchedule();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T21:26:00Z"));
        scheduledServerRepository.findDue.mockResolvedValue([schedule]);
        scheduledServerRepository.claimForProcessing.mockResolvedValue(true);

        // When
        await sut.execute();

        // Then
        expect(scheduledServerRepository.claimForProcessing).toHaveBeenCalledWith("schedule-1", expect.any(Date));
        expect(backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
            "create-scheduled-server",
            { scheduleId: "schedule-1" },
            undefined,
            undefined,
            { ownerId: "user-1" }
        );
        // Creation is delegated to the background queue — the routine must not
        // create the server itself nor send the creation DMs
        expect(user.send).not.toHaveBeenCalled();
        expect(scheduledServerRepository.markStatus).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it("should enqueue one create-scheduled-server task per due schedule", async () => {
        // Given
        const schedule1 = createSchedule({ id: "schedule-1" });
        const schedule2 = createSchedule({ id: "schedule-2", userId: "user-2" });
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T21:26:00Z"));
        scheduledServerRepository.findDue.mockResolvedValue([schedule1, schedule2]);
        scheduledServerRepository.claimForProcessing.mockResolvedValue(true);

        // When
        await sut.execute();

        // Then
        expect(backgroundTaskQueue.enqueue).toHaveBeenCalledTimes(2);
        expect(backgroundTaskQueue.enqueue).toHaveBeenNthCalledWith(1, "create-scheduled-server", { scheduleId: "schedule-1" }, undefined, undefined, { ownerId: "user-1" });
        expect(backgroundTaskQueue.enqueue).toHaveBeenNthCalledWith(2, "create-scheduled-server", { scheduleId: "schedule-2" }, undefined, undefined, { ownerId: "user-2" });

        vi.useRealTimers();
    });

    it("should skip schedules that could not be claimed (overlapping tick)", async () => {
        // Given
        const schedule = createSchedule();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T21:26:00Z"));
        scheduledServerRepository.findDue.mockResolvedValue([schedule]);
        scheduledServerRepository.claimForProcessing.mockResolvedValue(false);

        // When
        await sut.execute();

        // Then
        expect(backgroundTaskQueue.enqueue).not.toHaveBeenCalled();
        expect(scheduledServerRepository.markStatus).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    it("should mark stuck creating schedules as failed and DM the user", async () => {
        // Given
        const stuck = createSchedule({ id: "stuck-1", status: "creating", updatedAt: new Date(Date.now() - 21 * 60 * 1000) });
        scheduledServerRepository.findStuckCreating.mockResolvedValue([stuck]);

        // When
        await sut.execute();

        // Then
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("stuck-1", "failed", undefined, expect.any(Date));
        expect(user.send).toHaveBeenCalledTimes(1);
        expect(user.send).toHaveBeenCalledWith(expect.stringContaining("did not complete"));
        expect(eventLogger.log).toHaveBeenCalled();
    });

    it("should mark a schedule failed with the offline DM when past the grace period", async () => {
        // Given
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T22:30:00Z"));
        const schedule = createSchedule({ triggerAt: new Date("2026-08-01T21:25:00Z") });
        scheduledServerRepository.findDue.mockResolvedValue([schedule]);

        // When
        await sut.execute();

        // Then
        expect(scheduledServerRepository.markStatus).toHaveBeenCalledWith("schedule-1", "failed", undefined, expect.any(Date));
        expect(user.send).toHaveBeenCalledTimes(1);
        expect(user.send).toHaveBeenCalledWith(expect.stringContaining("bot was offline"));
        expect(scheduledServerRepository.claimForProcessing).not.toHaveBeenCalled();
        expect(backgroundTaskQueue.enqueue).not.toHaveBeenCalled();

        vi.useRealTimers();
    });
});
