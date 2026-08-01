import { Knex, knex as createKnex } from "knex";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Region } from "@tf2qs/core";
import { ScheduledServer } from "@tf2qs/core";
import { SQLiteScheduledServerRepository } from "./SQLiteScheduledServerRepository";

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

describe("SQLiteScheduledServerRepository", () => {
    let knex: Knex;
    let sut: SQLiteScheduledServerRepository;

    beforeEach(async () => {
        knex = createKnex({
            client: "sqlite3",
            connection: { filename: ":memory:" },
            useNullAsDefault: true,
            pool: { min: 0, max: 1 },
        });
        await knex.schema.createTable("scheduled_servers", (table) => {
            table.string("id").primary();
            table.string("userId").notNullable();
            table.string("guildId").nullable();
            table.string("region").notNullable();
            table.string("variant").notNullable();
            table.timestamp("scheduledAt").notNullable();
            table.timestamp("triggerAt").notNullable();
            table.string("status").notNullable().defaultTo("scheduled");
            table.check("status IN ('scheduled','creating','created','failed','cancelled')");
            table.string("serverId").nullable();
            table.string("timezone").notNullable();
            table.timestamp("createdAt").notNullable();
            table.timestamp("updatedAt").notNullable();
            table.index(["userId"]);
            table.index(["status"]);
            table.index(["status", "triggerAt"]);
        });
        sut = new SQLiteScheduledServerRepository({ knex });
    });

    afterEach(async () => {
        await knex.destroy();
    });

    it("should create and read back a schedule with deserialized dates", async () => {
        // Given
        const schedule = createSchedule();

        // When
        await sut.create(schedule);

        // Then
        const found = await sut.findActiveByUserId("user-1");
        expect(found).toHaveLength(1);
        expect(found[0]).toEqual(schedule);
        expect(found[0].scheduledAt).toBeInstanceOf(Date);
        expect(found[0].triggerAt.getTime()).toBe(new Date("2026-08-01T21:25:00Z").getTime());
    });

    it("should find a schedule by id with deserialized dates", async () => {
        // Given
        const schedule = createSchedule({ guildId: "guild-1", serverId: "server-9" });
        await sut.create(schedule);

        // When
        const found = await sut.findById(schedule.id);

        // Then
        expect(found).toEqual(schedule);
        expect(found?.scheduledAt).toBeInstanceOf(Date);
        expect(found?.triggerAt.getTime()).toBe(new Date("2026-08-01T21:25:00Z").getTime());
    });

    it("should return null when no schedule matches the id", async () => {
        // When
        const found = await sut.findById("nonexistent");

        // Then
        expect(found).toBeNull();
    });

    it("should store null guildId and serverId as null", async () => {        // Given
        const schedule = createSchedule({ guildId: null, serverId: null });

        // When
        await sut.create(schedule);

        // Then
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.guildId).toBeNull();
        expect(row.serverId).toBeNull();
    });

    it("should persist guildId and serverId when present", async () => {
        // Given
        const schedule = createSchedule({ guildId: "guild-1", serverId: "server-9" });

        // When
        await sut.create(schedule);

        // Then
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.guildId).toBe("guild-1");
        expect(row.serverId).toBe("server-9");
    });

    it("should only find active (scheduled/creating) schedules for a user", async () => {
        // Given
        await sut.create(createSchedule({ id: "a1", userId: "user-1", status: "scheduled" }));
        await sut.create(createSchedule({ id: "a2", userId: "user-1", status: "creating" }));
        await sut.create(createSchedule({ id: "a3", userId: "user-1", status: "cancelled" }));
        await sut.create(createSchedule({ id: "a4", userId: "user-1", status: "created" }));
        await sut.create(createSchedule({ id: "a5", userId: "user-2", status: "scheduled" }));

        // When
        const found = await sut.findActiveByUserId("user-1");

        // Then
        expect(found.map(s => s.id)).toEqual(["a1", "a2"]);
    });

    it("should order active schedules by scheduledAt ascending", async () => {
        // Given
        await sut.create(createSchedule({ id: "later", scheduledAt: new Date("2026-08-03T21:30:00Z") }));
        await sut.create(createSchedule({ id: "earlier", scheduledAt: new Date("2026-08-01T21:30:00Z") }));

        // When
        const found = await sut.findActiveByUserId("user-1");

        // Then
        expect(found.map(s => s.id)).toEqual(["earlier", "later"]);
    });

    it("should find due schedules whose triggerAt is at or before now", async () => {
        // Given
        const now = new Date("2026-08-01T21:26:00Z");
        await sut.create(createSchedule({ id: "due", triggerAt: new Date("2026-08-01T21:25:00Z") }));
        await sut.create(createSchedule({ id: "boundary", triggerAt: now }));
        await sut.create(createSchedule({ id: "future", triggerAt: new Date("2026-08-01T21:27:00Z") }));
        await sut.create(createSchedule({ id: "not-scheduled", status: "creating", triggerAt: new Date("2026-08-01T21:25:00Z") }));

        // When
        const found = await sut.findDue(now);

        // Then
        expect(found.map(s => s.id)).toEqual(["due", "boundary"]);
    });

    it("should find stuck creating schedules updated at or before the given time", async () => {
        // Given
        const before = new Date("2026-08-01T10:21:00Z");
        await sut.create(createSchedule({ id: "stuck", status: "creating", updatedAt: new Date("2026-08-01T10:00:00Z") }));
        await sut.create(createSchedule({ id: "boundary", status: "creating", updatedAt: before }));
        await sut.create(createSchedule({ id: "fresh", status: "creating", updatedAt: new Date("2026-08-01T10:22:00Z") }));
        await sut.create(createSchedule({ id: "scheduled-not-stuck", status: "scheduled", updatedAt: new Date("2026-08-01T10:00:00Z") }));

        // When
        const found = await sut.findStuckCreating(before);

        // Then
        expect(found.map(s => s.id)).toEqual(["stuck", "boundary"]);
    });

    it("should claim a scheduled schedule and return true", async () => {
        // Given
        const schedule = createSchedule();
        await sut.create(schedule);
        const now = new Date("2026-08-01T21:26:00Z");

        // When
        const claimed = await sut.claimForProcessing(schedule.id, now);

        // Then
        expect(claimed).toBe(true);
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("creating");
        expect(new Date(row.updatedAt).getTime()).toBe(now.getTime());
    });

    it("should not claim a schedule that is not in scheduled status", async () => {
        // Given
        const schedule = createSchedule({ status: "creating", serverId: "server-1" });
        await sut.create(schedule);

        // When
        const claimed = await sut.claimForProcessing(schedule.id, new Date());

        // Then
        expect(claimed).toBe(false);
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("creating");
    });

    it("should mark the status and optionally the server id", async () => {
        // Given
        const schedule = createSchedule();
        await sut.create(schedule);
        const now = new Date("2026-08-01T21:50:00Z");

        // When
        await sut.markStatus(schedule.id, "created", "server-1", now);

        // Then
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("created");
        expect(row.serverId).toBe("server-1");
        expect(new Date(row.updatedAt).getTime()).toBe(now.getTime());
    });

    it("should clear the server id when marking without one", async () => {
        // Given
        const schedule = createSchedule({ serverId: "server-1" });
        await sut.create(schedule);

        // When
        await sut.markStatus(schedule.id, "failed", undefined, new Date());

        // Then
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("failed");
        expect(row.serverId).toBeNull();
    });

    it("should cancel a scheduled schedule and return true", async () => {
        // Given
        const schedule = createSchedule();
        await sut.create(schedule);
        const now = new Date("2026-08-01T12:00:00Z");

        // When
        const cancelled = await sut.cancel(schedule.id, now);

        // Then
        expect(cancelled).toBe(true);
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("cancelled");
        expect(new Date(row.updatedAt).getTime()).toBe(now.getTime());
    });

    it("should not cancel a schedule that is not in scheduled status", async () => {
        // Given
        const schedule = createSchedule({ status: "creating", serverId: "server-1" });
        await sut.create(schedule);

        // When
        const cancelled = await sut.cancel(schedule.id, new Date());

        // Then
        expect(cancelled).toBe(false);
        const row = await knex("scheduled_servers").where({ id: schedule.id }).first();
        expect(row.status).toBe("creating");
    });

    it("should return an empty list for a user with no active schedules", async () => {
        // When
        const found = await sut.findActiveByUserId("ghost");

        // Then
        expect(found).toEqual([]);
    });
});
