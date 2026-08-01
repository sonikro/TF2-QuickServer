import { Knex } from "knex";
import { Region, ScheduledServer, ScheduledServerRepository, ScheduledServerStatus, Variant } from "@tf2qs/core";

// DB row shape as stored by create(): dates are ISO strings, nullable fields are null
type ScheduledServerRow = {
    id: string;
    userId: string;
    guildId: string | null;
    region: Region;
    variant: Variant;
    scheduledAt: string;
    triggerAt: string;
    status: ScheduledServerStatus;
    serverId: string | null;
    timezone: string;
    createdAt: string;
    updatedAt: string;
};

export class SQLiteScheduledServerRepository implements ScheduledServerRepository {

    constructor(private readonly dependencies: { knex: Knex }) {}

    async create(schedule: ScheduledServer): Promise<void> {
        await this.dependencies.knex('scheduled_servers')
            .insert({
                id: schedule.id,
                userId: schedule.userId,
                guildId: schedule.guildId ?? null,
                region: schedule.region,
                variant: schedule.variant,
                scheduledAt: schedule.scheduledAt.toISOString(),
                triggerAt: schedule.triggerAt.toISOString(),
                status: schedule.status,
                serverId: schedule.serverId ?? null,
                timezone: schedule.timezone,
                createdAt: schedule.createdAt.toISOString(),
                updatedAt: schedule.updatedAt.toISOString()
            });
    }

    async findById(id: string): Promise<ScheduledServer | null> {
        const row = await this.dependencies.knex('scheduled_servers')
            .where({ id })
            .first();
        return row ? this.deserialize(row) : null;
    }

    async findActiveByUserId(userId: string): Promise<ScheduledServer[]> {
        const rows = await this.dependencies.knex('scheduled_servers')
            .where({ userId })
            .whereIn('status', ['scheduled', 'creating'])
            .orderBy('scheduledAt', 'asc')
            .select('*');
        return rows.map(this.deserialize);
    }

    async findDue(now: Date): Promise<ScheduledServer[]> {
        const rows = await this.dependencies.knex('scheduled_servers')
            .where({ status: 'scheduled' })
            .andWhere('triggerAt', '<=', now.toISOString())
            .select('*');
        return rows.map(this.deserialize);
    }

    async findStuckCreating(before: Date): Promise<ScheduledServer[]> {
        const rows = await this.dependencies.knex('scheduled_servers')
            .where({ status: 'creating' })
            .andWhere('updatedAt', '<=', before.toISOString())
            .select('*');
        return rows.map(this.deserialize);
    }

    async claimForProcessing(id: string, now: Date): Promise<boolean> {
        const result = await this.dependencies.knex('scheduled_servers')
            .where({ id })
            .where({ status: 'scheduled' })
            .update({
                status: 'creating',
                updatedAt: now.toISOString()
            });
        return result === 1;
    }

    async markStatus(id: string, status: ScheduledServerStatus, serverId?: string, now?: Date): Promise<void> {
        const updatedAt = (now ?? new Date()).toISOString();
        await this.dependencies.knex('scheduled_servers')
            .where({ id })
            .update({
                status,
                serverId: serverId ?? null,
                updatedAt
            });
    }

    async cancel(id: string, now: Date): Promise<boolean> {
        const result = await this.dependencies.knex('scheduled_servers')
            .where({ id })
            .where({ status: 'scheduled' })
            .update({
                status: 'cancelled',
                updatedAt: now.toISOString()
            });
        return result === 1;
    }

    private deserialize(row: ScheduledServerRow): ScheduledServer {
        return {
            ...row,
            scheduledAt: toDate(row.scheduledAt),
            triggerAt: toDate(row.triggerAt),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt)
        };
    }
}

function toDate(value: string): Date {
    return new Date(value);
}
