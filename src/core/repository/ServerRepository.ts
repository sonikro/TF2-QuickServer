import { Knex } from "knex";
import { Server, ServerStatus } from "../domain";

export interface ServerRepository {
    upsertServer(server: Server, trx?: Knex.Transaction): Promise<void>;
    getAllServersByUserId(userId: string, trx?: Knex.Transaction): Promise<Server[]>;
    deleteServer(serverId: string): Promise<void>;
    findById(serverId: string): Promise<Server | null>;
    getAllServers(status?: ServerStatus): Promise<Server[]>;
    runInTransaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T>;
    findByLogsecret(logsecret: number): Promise<Server | null>;
}
