import { Knex } from "knex";

export class SQliteServerActivityRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async upsert(serverActivity: { serverId: string; emptySince: Date | null; lastCheckedAt: Date | null }): Promise<void> {
        await this.dependencies.knex("server_activity")
            .insert(serverActivity)
            .onConflict("serverId")
            .merge();
    }

    async deleteById(serverId: string): Promise<void> {
        await this.dependencies.knex("server_activity")
            .where({ serverId })
            .del();
    }

    async findById(serverId: string): Promise<{ serverId: string; emptySince: Date | null; lastCheckedAt: Date | null } | null> {
        const result = await this.dependencies.knex("server_activity")
            .where({ serverId })
            .first();

        if (!result) return null;

        return {
            serverId: result.serverId,
            emptySince: toDate(result.emptySince),
            lastCheckedAt: toDate(result.lastCheckedAt),
        };
    }

    async getAll(): Promise<{ serverId: string; emptySince: Date | null; lastCheckedAt: Date | null }[]> {
        const results = await this.dependencies.knex("server_activity").select("*");

        return results.map((result) => ({
            serverId: result.serverId,
            emptySince: toDate(result.emptySince),
            lastCheckedAt: toDate(result.lastCheckedAt),
        }));
    }
}

function toDate(value: any): Date | null {
    return value ? new Date(value) : null;
}
