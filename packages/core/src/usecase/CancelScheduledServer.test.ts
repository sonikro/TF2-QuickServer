import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../domain/Region";
import { ScheduledServer } from "../domain/ScheduledServer";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { UserError } from "../errors/UserError";
import { CancelScheduledServer } from "./CancelScheduledServer";

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

describe("CancelScheduledServer", () => {
    let scheduledServerRepository: ReturnType<typeof mock<ScheduledServerRepository>>;
    let eventLogger: ReturnType<typeof mock<EventLogger>>;
    let sut: CancelScheduledServer;

    beforeEach(() => {
        scheduledServerRepository = mock<ScheduledServerRepository>();
        eventLogger = mock<EventLogger>();
        sut = new CancelScheduledServer({ scheduledServerRepository, eventLogger });
    });

    it("should cancel a scheduled server and return the updated row", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([schedule]);
        scheduledServerRepository.cancel.mockResolvedValue(true);

        // When
        const result = await sut.execute({ userId: "user-1" });

        // Then
        expect(scheduledServerRepository.cancel).toHaveBeenCalledWith("schedule-1", expect.any(Date));
        expect(eventLogger.log).toHaveBeenCalled();
        expect(result.status).toBe("cancelled");
    });

    it("should throw UserError if there is no active schedule", async () => {
        // Given
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([]);

        // When/Then
        await expect(sut.execute({ userId: "user-1" })).rejects.toThrow(UserError);
        await expect(sut.execute({ userId: "user-1" })).rejects.toThrow("You don't have an active scheduled server.");
        expect(scheduledServerRepository.cancel).not.toHaveBeenCalled();
    });

    it("should throw UserError if the schedule is already being created", async () => {
        // Given
        const schedule = createSchedule({ status: "creating" });
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([schedule]);

        // When/Then
        await expect(sut.execute({ userId: "user-1" })).rejects.toThrow(UserError);
        await expect(sut.execute({ userId: "user-1" })).rejects.toThrow("too late");
        expect(scheduledServerRepository.cancel).not.toHaveBeenCalled();
    });

    it("should throw UserError if cancel races and returns false", async () => {
        // Given
        const schedule = createSchedule();
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([schedule]);
        scheduledServerRepository.cancel.mockResolvedValue(false);

        // When/Then
        await expect(sut.execute({ userId: "user-1" })).rejects.toThrow(UserError);
        expect(scheduledServerRepository.cancel).toHaveBeenCalledWith("schedule-1", expect.any(Date));
    });
});
