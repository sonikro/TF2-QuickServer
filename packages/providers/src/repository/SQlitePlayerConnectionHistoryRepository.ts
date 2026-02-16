import { Knex } from "knex";
import { PlayerConnectionHistory, PlayerConnectionHistoryRepository } from "@tf2qs/core";

type SQlitePlayerConnectionHistoryRepositoryDependencies = {
    knex: Knex;
};

export class SQlitePlayerConnectionHistoryRepository implements PlayerConnectionHistoryRepository {
    constructor(private readonly dependencies: SQlitePlayerConnectionHistoryRepositoryDependencies) {}

    async save(params: { connectionHistory: Omit<PlayerConnectionHistory, "id"> }): Promise<PlayerConnectionHistory> {
        const { connectionHistory } = params;
        const { knex } = this.dependencies;

        const [id] = await knex("player_connection_history").insert({
            steam_id_3: connectionHistory.steamId3,
            ip_address: connectionHistory.ipAddress,
            nickname: connectionHistory.nickname,
        });

        return {
            id,
            steamId3: connectionHistory.steamId3,
            ipAddress: connectionHistory.ipAddress,
            nickname: connectionHistory.nickname,
        };
    }

    async findBySteamId3(params: { steamId3: string }): Promise<PlayerConnectionHistory[]> {
        const { steamId3 } = params;
        const { knex } = this.dependencies;

        const rows = await knex("player_connection_history")
            .where("steam_id_3", steamId3)
            .orderBy("timestamp", "desc")
            .select("id", "steam_id_3", "ip_address", "nickname", "timestamp");

        return rows.map(row => ({
            id: row.id,
            steamId3: row.steam_id_3,
            ipAddress: row.ip_address,
            nickname: row.nickname,
            timestamp: new Date(row.timestamp),
        }));
    }
}
