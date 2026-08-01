import { describe, expect, it } from "vitest";
import { Region, ScheduledServer, ScheduledServerStatus } from "@tf2qs/core";
import { formatScheduledServerMessage } from "./formatScheduledServerMessage";

function createSchedule(overrides: Partial<ScheduledServer> = {}): ScheduledServer {
    return {
        id: "schedule-1",
        userId: "user-1",
        guildId: null,
        region: "sa-saopaulo-1" as Region,
        variant: "standard-competitive",
        scheduledAt: new Date("2026-08-03T21:30:00Z"),
        triggerAt: new Date("2026-08-03T21:25:00Z"),
        status: "scheduled",
        serverId: null,
        timezone: "UTC",
        createdAt: new Date("2026-08-01T10:00:00Z"),
        updatedAt: new Date("2026-08-01T10:00:00Z"),
        ...overrides,
    };
}

describe("formatScheduledServerMessage", () => {

    describe("status labels", () => {
        it.each<[ScheduledServerStatus, string]>([
            ["scheduled", "⏳ Scheduled"],
            ["creating", "🛠️ Creating"],
            ["created", "✅ Created"],
            ["failed", "❌ Failed"],
            ["cancelled", "🚫 Cancelled"],
        ])("should render the label for the %s status", (status, label) => {
            // Given
            const schedule = createSchedule({ status });

            // When
            const message = formatScheduledServerMessage(schedule);

            // Then
            expect(message).toContain(label);
        });

        it("should only show a relative duration for the scheduled status", () => {
            // Given
            const scheduled = createSchedule({ status: "scheduled", scheduledAt: new Date("2099-08-03T21:30:00Z") });
            const created = createSchedule({ status: "created" });

            // When
            const scheduledMessage = formatScheduledServerMessage(scheduled);
            const createdMessage = formatScheduledServerMessage(created);

            // Then
            expect(scheduledMessage).toContain("from now");
            expect(createdMessage).not.toContain("from now");
        });
    });

    describe("index", () => {
        it("should omit the schedule number when no index is provided", () => {
            // When
            const message = formatScheduledServerMessage(createSchedule());

            // Then
            expect(message).toContain("**São Paulo**");
            expect(message).not.toContain("Schedule ");
        });

        it("should number the schedule starting from 1 when an index is provided", () => {
            // When
            const message = formatScheduledServerMessage(createSchedule(), 0);

            // Then
            expect(message).toContain("**Schedule 1** (São Paulo)");
        });

        it("should use the 1-based index for the schedule number", () => {
            // When
            const message = formatScheduledServerMessage(createSchedule(), 3);

            // Then
            expect(message).toContain("**Schedule 4** (São Paulo)");
        });
    });

    describe("times", () => {
        it("should render the local timezone time and the UTC time", () => {
            // Given
            const schedule = createSchedule({ timezone: "America/New_York" });

            // When
            const message = formatScheduledServerMessage(schedule);

            // Then
            expect(message).toContain("Mon, Aug 3, 2026 at 17:30 (America/New_York)");
            expect(message).toContain("🕐 (Mon, Aug 3, 2026 at 21:30 UTC)");
        });

        it("should show overdue when the scheduled time has already passed", () => {
            // Given
            const schedule = createSchedule({ scheduledAt: new Date("2020-08-03T21:30:00Z") });

            // When
            const message = formatScheduledServerMessage(schedule);

            // Then
            expect(message).toContain("(overdue from now)");
        });
    });

    describe("display names", () => {
        it("should render the region and variant display names", () => {
            // When
            const message = formatScheduledServerMessage(createSchedule());

            // Then
            expect(message).toContain("🌍 **Region:** `São Paulo`");
            expect(message).toContain("🎮 **Variant:** `Standard Competitive`");
        });
    });
});
