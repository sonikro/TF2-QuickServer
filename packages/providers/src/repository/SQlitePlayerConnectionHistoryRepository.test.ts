import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Knex, knex } from "knex";
import { SQlitePlayerConnectionHistoryRepository } from "./SQlitePlayerConnectionHistoryRepository";

describe("SQlitePlayerConnectionHistoryRepository", () => {
    let db: Knex;
    let repository: SQlitePlayerConnectionHistoryRepository;

    beforeEach(async () => {
        db = knex({
            client: "sqlite3",
            connection: ":memory:",
            useNullAsDefault: true,
        });

        await db.schema.createTable("player_connection_history", (table) => {
            table.increments("id").primary();
            table.string("steam_id_3").notNullable();
            table.string("ip_address").notNullable();
            table.string("nickname").notNullable();
            table.timestamp("timestamp").notNullable().defaultTo(db.fn.now());
        });

        repository = new SQlitePlayerConnectionHistoryRepository({ knex: db });
    });

    afterEach(async () => {
        await db.destroy();
    });

    describe("save", () => {
        it("should save player connection history", async () => {
            const result = await repository.save({
                connectionHistory: {
                    steamId3: "[U:1:12345678]",
                    ipAddress: "192.168.1.1",
                    nickname: "TestPlayer",
                },
            });

            expect(result).toMatchObject({
                id: expect.any(Number),
                steamId3: "[U:1:12345678]",
                ipAddress: "192.168.1.1",
                nickname: "TestPlayer",
            });
        });
    });

    describe("findBySteamId3", () => {
        it("should return empty array when no history found", async () => {
            const result = await repository.findBySteamId3({
                steamId3: "[U:1:99999999]",
            });

            expect(result).toEqual([]);
        });

        it("should find connection history by steamId3", async () => {
            // Insert directly with explicit timestamps to ensure order
            await db("player_connection_history").insert({
                steam_id_3: "[U:1:12345678]",
                ip_address: "192.168.1.1",
                nickname: "TestPlayer",
                timestamp: new Date("2024-01-01T10:00:00Z"),
            });

            await db("player_connection_history").insert({
                steam_id_3: "[U:1:12345678]",
                ip_address: "192.168.1.2",
                nickname: "TestPlayer2",
                timestamp: new Date("2024-01-01T11:00:00Z"),
            });

            const result = await repository.findBySteamId3({
                steamId3: "[U:1:12345678]",
            });

            expect(result).toHaveLength(2);
            // Most recent first (11:00)
            expect(result[0]).toMatchObject({
                steamId3: "[U:1:12345678]",
                ipAddress: "192.168.1.2",
                nickname: "TestPlayer2",
                timestamp: expect.any(Date),
            });
            // Older second (10:00)
            expect(result[1]).toMatchObject({
                steamId3: "[U:1:12345678]",
                ipAddress: "192.168.1.1",
                nickname: "TestPlayer",
                timestamp: expect.any(Date),
            });
        });

        it("should order results by timestamp descending (newest first)", async () => {
            // Insert directly with explicit timestamps
            await db("player_connection_history").insert({
                steam_id_3: "[U:1:12345678]",
                ip_address: "192.168.1.1",
                nickname: "OlderConnection",
                timestamp: new Date("2024-01-01T10:00:00Z"),
            });

            await db("player_connection_history").insert({
                steam_id_3: "[U:1:12345678]",
                ip_address: "192.168.1.2",
                nickname: "NewerConnection",
                timestamp: new Date("2024-01-01T12:00:00Z"),
            });

            const result = await repository.findBySteamId3({
                steamId3: "[U:1:12345678]",
            });

            expect(result[0].nickname).toBe("NewerConnection");
            expect(result[1].nickname).toBe("OlderConnection");
        });

        it("should not return history for different steamId3", async () => {
            await repository.save({
                connectionHistory: {
                    steamId3: "[U:1:12345678]",
                    ipAddress: "192.168.1.1",
                    nickname: "Player1",
                },
            });

            await repository.save({
                connectionHistory: {
                    steamId3: "[U:1:87654321]",
                    ipAddress: "192.168.1.2",
                    nickname: "Player2",
                },
            });

            const result = await repository.findBySteamId3({
                steamId3: "[U:1:12345678]",
            });

            expect(result).toHaveLength(1);
            expect(result[0].steamId3).toBe("[U:1:12345678]");
        });
    });
});
