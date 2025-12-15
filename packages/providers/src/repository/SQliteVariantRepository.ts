import { Knex } from "knex";
import { GuildVariant, VariantRepository } from "@tf2qs/core";

export class SQliteVariantRepository implements VariantRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async create(params: { variant: GuildVariant }): Promise<GuildVariant> {
        const { variant } = params;
        
        const [id] = await this.dependencies.knex("guild_variants").insert({
            guild_id: variant.guildId,
            variant_name: variant.variantName,
            display_name: variant.displayName,
            hostname: variant.hostname,
            default_cfgs: variant.defaultCfgs ? JSON.stringify(variant.defaultCfgs) : null,
            admins: variant.admins ? JSON.stringify(variant.admins) : null,
            image: variant.image,
            empty_minutes_terminate: variant.emptyMinutesTerminate,
        });

        return {
            ...variant,
            id,
        };
    }

    async findByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<GuildVariant | null> {
        const { guildId, variantName } = params;
        
        const result = await this.dependencies.knex("guild_variants")
            .where({ guild_id: guildId, variant_name: variantName })
            .first();

        if (!result) return null;

        return this.mapToGuildVariant(result);
    }

    async findByGuildId(params: { guildId: string }): Promise<GuildVariant[]> {
        const { guildId } = params;
        
        const results = await this.dependencies.knex("guild_variants")
            .where({ guild_id: guildId });

        return results.map(this.mapToGuildVariant);
    }

    async deleteByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<void> {
        const { guildId, variantName } = params;
        
        await this.dependencies.knex("guild_variants")
            .where({ guild_id: guildId, variant_name: variantName })
            .delete();
    }

    private mapToGuildVariant(row: any): GuildVariant {
        return {
            id: row.id,
            guildId: row.guild_id,
            variantName: row.variant_name,
            displayName: row.display_name,
            hostname: row.hostname,
            defaultCfgs: row.default_cfgs ? JSON.parse(row.default_cfgs) : undefined,
            admins: row.admins ? JSON.parse(row.admins) : undefined,
            image: row.image,
            emptyMinutesTerminate: row.empty_minutes_terminate,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
