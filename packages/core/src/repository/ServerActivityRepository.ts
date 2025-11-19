import { Knex } from "knex";
import { ServerActivity } from "../domain/ServerActivity";

export interface ServerActivityRepository {
    upsert(serverActivity: ServerActivity, trx?: Knex.Transaction): Promise<void>;
    deleteById(serverId: string, trx?: Knex.Transaction): Promise<void>;
    findById(serverId: string, trx?: Knex.Transaction): Promise<ServerActivity | null>;
    getAll(trx?: Knex.Transaction): Promise<ServerActivity[]>;
    runInTransaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T>;
}