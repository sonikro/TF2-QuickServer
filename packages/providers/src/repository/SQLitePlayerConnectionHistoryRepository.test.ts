import { Knex, knex as createKnex } from "knex";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SQLitePlayerConnectionHistoryRepository } from "./SQLitePlayerConnectionHistoryRepository";

type SeedConnectionParams = {
    steamId3: string;
    ipAddress: string;
    timestamp: string;
    nickname?: string;
};

async function seedConnection(knex: Knex, params: SeedConnectionParams): Promise<void> {
    const { steamId3, ipAddress, timestamp, nickname = "player" } = params;
    await knex("player_connection_history").insert({
        steam_id_3: steamId3,
        ip_address: ipAddress,
        nickname,
        timestamp,
    });
}

describe("SQLitePlayerConnectionHistoryRepository", () => {
    let knex: Knex;
    let sut: SQLitePlayerConnectionHistoryRepository;

    beforeEach(async () => {
        knex = createKnex({
            client: "sqlite3",
            connection: { filename: ":memory:" },
            useNullAsDefault: true,
            pool: { min: 0, max: 1 },
        });
        await knex.schema.createTable("player_connection_history", (table) => {
            table.increments("id").primary();
            table.string("steam_id_3").notNullable();
            table.string("ip_address").notNullable();
            table.string("nickname").notNullable();
            table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
        });
        sut = new SQLitePlayerConnectionHistoryRepository({ knex });
    });

    afterEach(async () => {
        await knex.destroy();
    });

    function makeSut() {
        return { sut, knex };
    }

    it("should return each distinct IP with its earliest detected timestamp for a steam ID", async () => {
        // Given
        const { sut, knex } = makeSut();
        await seedConnection(knex, { steamId3: "U:1:111", ipAddress: "1.1.1.1", timestamp: "2026-08-01T10:00:00.000Z" });
        await seedConnection(knex, { steamId3: "U:1:111", ipAddress: "1.1.1.1", timestamp: "2026-08-03T10:00:00.000Z" });
        await seedConnection(knex, { steamId3: "U:1:111", ipAddress: "2.2.2.2", timestamp: "2026-08-02T10:00:00.000Z" });

        // When
        const result = await sut.getFirstSeenIpsBySteamId3("U:1:111");

        // Then
        expect(result).toHaveLength(2);
        expect(result).toEqual(expect.arrayContaining([
            { ipAddress: "1.1.1.1", firstSeenAt: new Date("2026-08-01T10:00:00.000Z") },
            { ipAddress: "2.2.2.2", firstSeenAt: new Date("2026-08-02T10:00:00.000Z") },
        ]));
    });

    it("should return only the queried steam ID's IPs", async () => {
        // Given
        const { sut, knex } = makeSut();
        await seedConnection(knex, { steamId3: "U:1:111", ipAddress: "1.1.1.1", timestamp: "2026-08-01T10:00:00.000Z" });
        await seedConnection(knex, { steamId3: "U:1:111", ipAddress: "3.3.3.3", timestamp: "2026-08-02T10:00:00.000Z" });
        await seedConnection(knex, { steamId3: "U:1:222", ipAddress: "9.9.9.9", timestamp: "2026-08-03T10:00:00.000Z" });

        // When
        const result = await sut.getFirstSeenIpsBySteamId3("U:1:111");

        // Then
        expect(result).toHaveLength(2);
        expect(result).toEqual(expect.arrayContaining([
            { ipAddress: "1.1.1.1", firstSeenAt: new Date("2026-08-01T10:00:00.000Z") },
            { ipAddress: "3.3.3.3", firstSeenAt: new Date("2026-08-02T10:00:00.000Z") },
        ]));
    });

    it("should return an empty array for an unknown steam ID", async () => {
        // Given
        const { sut } = makeSut();

        // When
        const result = await sut.getFirstSeenIpsBySteamId3("U:1:999");

        // Then
        expect(result).toEqual([]);
    });
});
