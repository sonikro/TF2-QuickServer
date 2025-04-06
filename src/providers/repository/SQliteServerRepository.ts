import { Knex } from "knex";
import { Server } from "../../core/domain";
import { ServerRepository } from "../../core/repository/ServerRepository";

export class SQLiteServerRepository implements ServerRepository {

    constructor(private readonly dependencies: {
        knex: Knex
    }){}

    async upsertServer(server: Server): Promise<void> {
        await this.dependencies.knex<Server>('servers')
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
                createdAt: new Date(),
                createdBy: server.createdBy
            } as Server)
            .onConflict('serverId')
            .merge();
    }
    async deleteServer(serverId: string): Promise<void> {
        await this.dependencies.knex<Server>('servers')
            .where({ serverId })
            .del();
    }

    async findById(serverId: string): Promise<Server | null> {
        const server = await this.dependencies.knex<Server>('servers')
            .where({ serverId })
            .first();
        return server || null;
    }

}