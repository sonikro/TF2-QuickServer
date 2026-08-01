import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { Region } from "../domain/Region";
import { ScheduledServer } from "../domain/ScheduledServer";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { GetUserSchedules } from "./GetUserSchedules";

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

describe("GetUserSchedules", () => {
    it("should return the repository rows in the repository's order", async () => {
        // Given
        const scheduledServerRepository = mock<ScheduledServerRepository>();
        const schedules = [
            createSchedule({ id: "schedule-1", scheduledAt: new Date("2026-08-02T21:30:00Z") }),
            createSchedule({ id: "schedule-2", status: "creating", scheduledAt: new Date("2026-08-01T21:30:00Z") }),
        ];
        scheduledServerRepository.findActiveByUserId.mockResolvedValue(schedules);
        const sut = new GetUserSchedules({ scheduledServerRepository });

        // When
        const result = await sut.execute({ userId: "user-1" });

        // Then
        expect(scheduledServerRepository.findActiveByUserId).toHaveBeenCalledWith("user-1");
        // The repository contract guarantees scheduledAt ASC ordering, so the use case passes rows through unchanged
        expect(result).toEqual(schedules);
    });

    it("should pass through an empty result", async () => {
        // Given
        const scheduledServerRepository = mock<ScheduledServerRepository>();
        scheduledServerRepository.findActiveByUserId.mockResolvedValue([]);
        const sut = new GetUserSchedules({ scheduledServerRepository });

        // When
        const result = await sut.execute({ userId: "user-1" });

        // Then
        expect(result).toEqual([]);
    });
});
