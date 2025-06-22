import { Knex } from "knex";
import { UserBanRepository } from "../../core/repository/UserBanRepository";

export class SQliteUserBanRepository implements UserBanRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async isUserBanned(steamId: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }> {
        const { knex } = this.dependencies;
        let query = knex("user_ban").where("steam_id", steamId);
        if (discordUserId) {
            query = query.orWhere("discord_user_id", discordUserId);
        }
        const result = await query.first();
        if (result) {
            return { isBanned: true, reason: result.reason || undefined };
        }
        return { isBanned: false };
    }
}
