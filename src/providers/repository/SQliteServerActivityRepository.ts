import { Knex } from "knex";

export class SQliteServerActivityRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async upsert(serverActivity: { serverId: string; emptySince: Date | null; lastCheckedAt: Date | null }, trx?: Knex.Transaction): Promise<void> {
        const query = this.dependencies.knex("server_activity")
            .insert(serverActivity)
            .onConflict("serverId")
            .merge();

        if (trx) {
            query.transacting(trx);
        }

        await query;
    }

    async deleteById(serverId: string, trx?: Knex.Transaction): Promise<void> {
        const query = this.dependencies.knex("server_activity")
            .where({ serverId })
            .del();

        if (trx) {
            query.transacting(trx);
        }

        await query;
    }

    async findById(serverId: string, trx?: Knex.Transaction): Promise<{ serverId: string; emptySince: Date | null; lastCheckedAt: Date | null } | null> {
        const query = this.dependencies.knex("server_activity")
            .where({ serverId })
            .first();

        if (trx) {
            query.transacting(trx);
        }

        const result = await query;

        if (!result) return null;

        return {
            serverId: result.serverId,
            emptySince: toDate(result.emptySince),
            lastCheckedAt: toDate(result.lastCheckedAt),
        };
    }

    async getAll(trx?: Knex.Transaction): Promise<{ serverId: string; emptySince: Date | null; lastCheckedAt: Date | null }[]> {
        const query = this.dependencies.knex("server_activity").select("*");

        if (trx) {
            query.transacting(trx);
        }

        const results = await query;

        return results.map((result) => ({
            serverId: result.serverId,
            emptySince: toDate(result.emptySince),
            lastCheckedAt: toDate(result.lastCheckedAt),
        }));
    }

    async runInTransaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
        return this.dependencies.knex.transaction(fn);
    }
}

function toDate(value: any): Date | null {
    return value ? new Date(value) : null;
}
