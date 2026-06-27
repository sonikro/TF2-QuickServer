import { Knex } from "knex";
import { PlayerConnectionHistory, PlayerConnectionHistoryRepository } from "@tf2qs/core";

type SQLitePlayerConnectionHistoryRepositoryDependencies = {
    knex: Knex;
};

export class SQLitePlayerConnectionHistoryRepository implements PlayerConnectionHistoryRepository {
    constructor(private readonly dependencies: SQLitePlayerConnectionHistoryRepositoryDependencies) {}

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
}
