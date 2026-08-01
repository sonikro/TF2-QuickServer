import { Client as DiscordClient, User, UserManager } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region } from "../domain/Region";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { IdGenerator } from "../services/IdGenerator";
import { UserError } from "../errors/UserError";
import { CreateScheduledServer } from "./CreateScheduledServer";
import { getScheduledCreationLeadMinutes } from "../domain/Region";

describe("CreateScheduledServer", () => {
    let scheduledServerRepository: ReturnType<typeof mock<ScheduledServerRepository>>;
    let idGenerator: ReturnType<typeof mock<IdGenerator>>;
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let users: ReturnType<typeof mock<UserManager>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let user: ReturnType<typeof mock<User>>;
    let sut: CreateScheduledServer;

    beforeEach(() => {
        scheduledServerRepository = mock<ScheduledServerRepository>();
        idGenerator = mock<IdGenerator>();
        users = mock<UserManager>();
        discordBot = mock<DiscordClient>({ users });
        eventLogger = mock<EventLogger>();
        user = mock<User>();

        idGenerator.generate.mockReturnValue("schedule-id-1");
        users.fetch.mockResolvedValue(user);
        user.send.mockResolvedValue(undefined as any);
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([]);

        sut = new CreateScheduledServer({
            scheduledServerRepository,
            idGenerator,
            discordBot,
            eventLogger,
        });
    });

    const baseArgs = {
        userId: "user-1",
        region: "sa-saopaulo-1" as Region,
        variantName: "standard-competitive" as const,
        time: "21:30",
        timezone: "UTC",
    };

    it("should compute scheduledAt, send the confirmation DM before persisting, and persist the row", async () => {
        // Given a fixed current time
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T10:00:00Z"));

        // When
        const result = await sut.execute(baseArgs);

        // Then the confirmation DM was sent before persisting
        expect(user.send).toHaveBeenCalledWith(expect.stringContaining("Server Scheduled"));
        expect(scheduledServerRepository.create).toHaveBeenCalledTimes(1);

        // And the persisted row uses the computed times and generated id
        const created = scheduledServerRepository.create.mock.calls[0][0];
        expect(created.id).toBe("schedule-id-1");
        expect(created.scheduledAt.toISOString()).toBe("2026-08-01T21:30:00.000Z");
        const leadMs = getScheduledCreationLeadMinutes(Region.SA_SAOPAULO_1) * 60_000;
        expect(created.triggerAt.toISOString()).toBe(
            new Date(new Date("2026-08-01T21:30:00.000Z").getTime() - leadMs).toISOString()
        );
        expect(created.status).toBe("scheduled");
        expect(created.userId).toBe("user-1");
        expect(created.variant).toBe("standard-competitive");
        expect(created.timezone).toBe("UTC");
        expect(result).toEqual(created);

        vi.useRealTimers();
    });

    it("should throw UserError and not persist if the user already has an active schedule", async () => {
        // Given an existing active schedule
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([{
            id: "existing-1",
            userId: "user-1",
            guildId: null,
            region: "sa-saopaulo-1" as Region,
            variant: "standard-competitive" as const,
            scheduledAt: new Date("2026-08-02T21:30:00Z"),
            triggerAt: new Date("2026-08-02T21:25:00Z"),
            status: "scheduled" as const,
            serverId: null,
            timezone: "UTC",
            createdAt: new Date(),
            updatedAt: new Date(),
        }]);

        // When/Then
        await expect(sut.execute(baseArgs)).rejects.toThrow(UserError);
        await expect(sut.execute(baseArgs)).rejects.toThrow("You can only schedule one server at a time");
        expect(scheduledServerRepository.create).not.toHaveBeenCalled();
        expect(user.send).not.toHaveBeenCalled();
    });

    it("should throw UserError and not persist if the confirmation DM cannot be sent", async () => {
        // Given the DM send fails
        user.send.mockRejectedValue(new Error("Cannot send messages to this user"));

        // When/Then
        await expect(sut.execute(baseArgs)).rejects.toThrow(UserError);
        expect(scheduledServerRepository.create).not.toHaveBeenCalled();
    });

    it("should throw UserError and not persist if the user cannot be fetched", async () => {
        // Given the user fetch fails
        users.fetch.mockRejectedValue(new Error("Unknown User"));

        // When/Then
        await expect(sut.execute(baseArgs)).rejects.toThrow(UserError);
        expect(scheduledServerRepository.create).not.toHaveBeenCalled();
    });

    it("should throw UserError for an invalid time", async () => {
        // When/Then
        await expect(sut.execute({ ...baseArgs, time: "25:99" })).rejects.toThrow(UserError);
        expect(scheduledServerRepository.create).not.toHaveBeenCalled();
        expect(user.send).not.toHaveBeenCalled();
    });

    it("should roll past times forward to tomorrow's date in the persisted row", async () => {
        // Given a fixed current time after 21:30 UTC
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T22:00:00Z"));

        // When
        await sut.execute(baseArgs);

        // Then the persisted row's scheduledAt is tomorrow
        const created = scheduledServerRepository.create.mock.calls[0][0];
        expect(created.scheduledAt.toISOString()).toBe("2026-08-02T21:30:00.000Z");

        vi.useRealTimers();
    });
});
