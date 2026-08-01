import { UserError } from "../errors/UserError";

export const SCHEDULE_TIMEZONES: readonly string[] = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "America/Argentina/Buenos_Aires",
    "America/Bogota",
    "Europe/London",
    "Europe/Lisbon",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Amsterdam",
    "Europe/Warsaw",
    "Europe/Moscow",
    "Europe/Istanbul",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidScheduleTime(time: string): boolean {
    return TIME_PATTERN.test(time);
}

type WallClockParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function getWallClockParts(date: Date, timezone: string): WallClockParts {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string): number => {
        const part = parts.find(p => p.type === type);
        return part ? Number(part.value) : 0;
    };
    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
    };
}

/**
 * Converts a wall-clock time (y, mo, d, h, m) in `timezone` to the UTC instant
 * it represents.
 *
 * DST boundary behavior (deterministic):
 * - Ambiguous local times (fall-back) resolve to the first occurrence.
 * - Nonexistent local times (spring-forward) resolve to the shifted instant
 *   (the wall clock reads the target time plus the DST gap).
 */
function wallClockToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    timezone: string,
    reference: Date,
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

    // Seed the offset from the reference instant's wall clock so ambiguous
    // times resolve to the first occurrence.
    const referenceWall = getWallClockParts(reference, timezone);
    let offset = reference.getTime() - Date.UTC(
        referenceWall.year,
        referenceWall.month - 1,
        referenceWall.day,
        referenceWall.hour,
        referenceWall.minute,
        referenceWall.second,
        0,
    );
    let candidate = naive + offset;
    let previousCandidate: number | null = null;
    const seen = new Set<number>();

    while (!seen.has(candidate)) {
        seen.add(candidate);
        const wall = getWallClockParts(new Date(candidate), timezone);
        const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second, 0);
        if (wallAsUtc === naive) {
            return new Date(candidate);
        }
        previousCandidate = candidate;
        candidate = naive + candidate - wallAsUtc;
    }

    // The candidate oscillates between the two instants flanking a DST gap
    // (nonexistent local time). Resolve to the forward-shifted instant: the
    // one whose wall clock reads later than the requested time.
    const previousWall = getWallClockParts(new Date(previousCandidate ?? candidate), timezone);
    const previousWallAsUtc = Date.UTC(previousWall.year, previousWall.month - 1, previousWall.day, previousWall.hour, previousWall.minute, previousWall.second, 0);
    const currentWall = getWallClockParts(new Date(candidate), timezone);
    const currentWallAsUtc = Date.UTC(currentWall.year, currentWall.month - 1, currentWall.day, currentWall.hour, currentWall.minute, currentWall.second, 0);

    if (previousWallAsUtc > naive) {
        return new Date(previousCandidate ?? candidate);
    }
    return new Date(candidate);
}

export function computeNextOccurrence(args: {
    time: string;
    timezone: string;
    now?: Date;
}): Date {
    const { time, timezone } = args;
    const reference = args.now ?? new Date();

    if (!isValidScheduleTime(time)) {
        throw new UserError(`Invalid time: ${time}. Please use HH:mm in 24-hour format (e.g. 21:30).`);
    }
    if (!SCHEDULE_TIMEZONES.includes(timezone)) {
        throw new UserError(`Invalid timezone: ${timezone}. Please select one of the supported timezones.`);
    }

    const [hour, minute] = time.split(":").map(Number);
    const referenceWall = getWallClockParts(reference, timezone);

    let candidate = wallClockToUtc(
        referenceWall.year,
        referenceWall.month,
        referenceWall.day,
        hour,
        minute,
        timezone,
        reference,
    );

    // If the candidate is not in the future, roll forward to the next wall day
    // (Date.UTC handles month/year rollover).
    if (candidate.getTime() <= reference.getTime()) {
        const nextDay = new Date(Date.UTC(referenceWall.year, referenceWall.month - 1, referenceWall.day + 1));
        candidate = wallClockToUtc(
            nextDay.getUTCFullYear(),
            nextDay.getUTCMonth() + 1,
            nextDay.getUTCDate(),
            hour,
            minute,
            timezone,
            reference,
        );
    }

    // Safety net: the result should always be a valid, future instant.
    if (Number.isNaN(candidate.getTime())) {
        throw new UserError(`Could not compute a schedule time for ${time} in ${timezone}.`);
    }

    return candidate;
}

export function formatDateTimeInTimeZone(
    date: Date,
    timezone: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        ...options,
    }).formatToParts(date);
    const get = (type: string): string => {
        const part = parts.find(p => p.type === type);
        return part ? part.value : "";
    };
    return `${get("weekday")}, ${get("month")} ${get("day")}, ${get("year")} at ${get("hour")}:${get("minute")}`;
}

export function formatDurationUntil(date: Date, now: Date): string {
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) {
        return "overdue";
    }
    if (diffMs === 0) {
        return "now";
    }
    if (diffMs < 60_000) {
        return "in less than a minute";
    }
    const totalMinutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
        return `in ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
        return `in ${hours}h`;
    }
    return `in ${minutes}m`;
}
