import { Knex } from "knex";
import { Server, ServerStatus } from "../../core/domain";
import { ServerRepository } from "../../core/repository/ServerRepository";

export class SQLiteServerRepository implements ServerRepository {

    constructor(private readonly dependencies: { knex: Knex }) {}

    async upsertServer(server: Server, trx?: Knex.Transaction): Promise<void> {
        const query = this.dependencies.knex<Server>('servers')
            .insert({
                serverId: server.serverId,
                region: server.region,
                variant: server.variant,
                hostIp: server.hostIp,
                hostPort: server.hostPort,
                tvIp: server.tvIp,
                tvPort: server.tvPort,
                rconPassword: server.rconPassword,
                hostPassword: server.hostPassword,
                rconAddress: server.rconAddress,
                tvPassword: server.tvPassword,
                createdAt: server.createdAt ?? new Date(),
                createdBy: server.createdBy,
                status: server.status,
                sv_logsecret: server.logSecret
            } as Server)
            .onConflict('serverId')
            .merge();

        if (trx) {
            query.transacting(trx);
        }

        await query;
    }

    async getAllServersByUserId(userId: string, trx?: Knex.Transaction): Promise<Server[]> {
        const query = this.dependencies.knex<Server>('servers')
            .where({ createdBy: userId })
            .select('*');

        if (trx) {
            query.transacting(trx);
        }

        const servers = await query;
        return servers.map(this.deserialize);
    }

    async deleteServer(serverId: string, trx?: Knex.Transaction): Promise<void> {
        const query = this.dependencies.knex<Server>('servers')
            .where({ serverId })
            .del();

        if (trx) {
            query.transacting(trx);
        }

        await query;
    }

    async findById(serverId: string, trx?: Knex.Transaction): Promise<Server | null> {
        const query = this.dependencies.knex<Server>('servers')
            .where({ serverId })
            .first();

        if (trx) {
            query.transacting(trx);
        }

        const server = await query;
        return server ? this.deserialize(server) : null;
    }

    async getAllServers(status?: ServerStatus, trx?: Knex.Transaction): Promise<Server[]> {
        const query = this.dependencies.knex<Server>('servers')
            .select('*');

        if (status) {
            query.where({ status });
        }

        if (trx) {
            query.transacting(trx);
        }

        const servers = await query;
        return servers.map(this.deserialize);
    }

    async runInTransaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
        return this.dependencies.knex.transaction(fn);
    }

    private deserialize(server: any): Server {
        return {
            ...server,
            createdAt: toDate(server.createdAt),
            logSecret: server.sv_logsecret
        };
    }

    async findByLogsecret(logsecret: number): Promise<Server | null> {
        const server = await this.dependencies.knex('servers')
            .where('sv_logsecret', logsecret)
            .first();
        return server ? this.deserialize(server) : null;
    }
}

function toDate(value: any): Date | undefined {
    return value ? new Date(value) : undefined;
}
