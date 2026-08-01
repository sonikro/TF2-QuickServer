import { describe, expect, it } from "vitest";
import { UserError } from "../errors/UserError";
import {
    SCHEDULE_TIMEZONES,
    isValidScheduleTime,
    computeNextOccurrence,
    formatDateTimeInTimeZone,
    formatDurationUntil,
} from "./scheduleTime";

describe("scheduleTime", () => {

    describe("SCHEDULE_TIMEZONES", () => {
        it("should contain at most 25 entries (Discord choice limit)", () => {
            expect(SCHEDULE_TIMEZONES.length).toBeLessThanOrEqual(25);
        });

        it("should include the timezones of every region the bot serves", () => {
            expect(SCHEDULE_TIMEZONES).toContain("America/New_York");
            expect(SCHEDULE_TIMEZONES).toContain("America/Chicago");
            expect(SCHEDULE_TIMEZONES).toContain("America/Sao_Paulo");
            expect(SCHEDULE_TIMEZONES).toContain("America/Argentina/Buenos_Aires");
            expect(SCHEDULE_TIMEZONES).toContain("America/Bogota");
            expect(SCHEDULE_TIMEZONES).toContain("Europe/Berlin");
            expect(SCHEDULE_TIMEZONES).toContain("Australia/Sydney");
        });
    });

    describe("isValidScheduleTime", () => {
        it("should accept valid 24h times", () => {
            expect(isValidScheduleTime("00:00")).toBe(true);
            expect(isValidScheduleTime("09:05")).toBe(true);
            expect(isValidScheduleTime("21:30")).toBe(true);
            expect(isValidScheduleTime("23:59")).toBe(true);
        });

        it("should reject invalid times", () => {
            expect(isValidScheduleTime("24:00")).toBe(false);
            expect(isValidScheduleTime("12:60")).toBe(false);
            expect(isValidScheduleTime("9:30")).toBe(false);
            expect(isValidScheduleTime("21:3")).toBe(false);
            expect(isValidScheduleTime("abc")).toBe(false);
            expect(isValidScheduleTime("21:30:00")).toBe(false);
            expect(isValidScheduleTime("")).toBe(false);
        });
    });

    describe("computeNextOccurrence", () => {
        it("should compute the occurrence for a valid time on the same day", () => {
            // Given a fixed now before 21:30 UTC
            const now = new Date("2026-08-01T10:00:00Z");
            // When
            const result = computeNextOccurrence({ time: "21:30", timezone: "UTC", now });
            // Then
            expect(result.toISOString()).toBe("2026-08-01T21:30:00.000Z");
        });

        it("should roll past times forward to tomorrow", () => {
            // Given a fixed now after 21:30 UTC
            const now = new Date("2026-08-01T22:00:00Z");
            // When
            const result = computeNextOccurrence({ time: "21:30", timezone: "UTC", now });
            // Then
            expect(result.toISOString()).toBe("2026-08-02T21:30:00.000Z");
        });

        it("should roll across month and year boundaries", () => {
            // Given a fixed now on Dec 31, 2026 at 23:00 UTC
            const now = new Date("2026-12-31T23:00:00Z");
            // When
            const result = computeNextOccurrence({ time: "21:30", timezone: "UTC", now });
            // Then
            expect(result.toISOString()).toBe("2027-01-01T21:30:00.000Z");
        });

        it("should resolve a nonexistent local time on spring-forward to the shifted instant (deterministic)", () => {
            // America/New_York springs forward 2026-03-08 at 02:00 → 03:00.
            // 02:30 on that date does not exist; deterministic resolution shifts to the instant whose wall clock reads 03:30.
            const now = new Date("2026-03-08T00:00:00Z");
            const result = computeNextOccurrence({ time: "02:30", timezone: "America/New_York", now });
            // When the DST gap is 1h, the shifted instant is 07:30Z (wall 03:30 EDT)
            expect(result.toISOString()).toBe("2026-03-08T07:30:00.000Z");
        });

        it("should resolve an ambiguous local time on fall-back to the first occurrence", () => {
            // Europe/London falls back 2026-10-25 at 02:00 → 01:00. 01:30 occurs twice.
            const now = new Date("2026-10-25T00:00:00Z");
            const result = computeNextOccurrence({ time: "01:30", timezone: "Europe/London", now });
            // First occurrence is 00:30Z (BST still active)
            expect(result.toISOString()).toBe("2026-10-25T00:30:00.000Z");
        });

        it("should support the UTC timezone", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            const result = computeNextOccurrence({ time: "11:15", timezone: "UTC", now });
            expect(result.toISOString()).toBe("2026-08-01T11:15:00.000Z");
        });

        it("should throw UserError for an invalid time", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            expect(() => computeNextOccurrence({ time: "25:99", timezone: "UTC", now }))
                .toThrow(UserError);
        });

        it("should throw UserError for an invalid timezone", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            expect(() => computeNextOccurrence({ time: "21:30", timezone: "Not/A_Timezone", now }))
                .toThrow(UserError);
        });

        it("should default now to the current time when not provided", () => {
            // Just assert it does not throw and returns a future instant
            const result = computeNextOccurrence({ time: "21:30", timezone: "UTC" });
            expect(result.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe("formatDateTimeInTimeZone", () => {
        it("should render a date in the given timezone", () => {
            const date = new Date("2026-08-03T21:30:00Z");
            const result = formatDateTimeInTimeZone(date, "UTC");
            expect(result).toBe("Mon, Aug 3, 2026 at 21:30");
        });
    });

    describe("formatDurationUntil", () => {
        it("should format a duration in hours and minutes", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            const date = new Date("2026-08-01T12:15:00Z");
            expect(formatDurationUntil(date, now)).toBe("in 2h 15m");
        });

        it("should format a duration under a minute", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            const date = new Date("2026-08-01T10:00:30Z");
            expect(formatDurationUntil(date, now)).toBe("in less than a minute");
        });

        it("should return overdue for past dates", () => {
            const now = new Date("2026-08-01T10:00:00Z");
            const date = new Date("2026-08-01T09:00:00Z");
            expect(formatDurationUntil(date, now)).toBe("overdue");
        });
    });
});
