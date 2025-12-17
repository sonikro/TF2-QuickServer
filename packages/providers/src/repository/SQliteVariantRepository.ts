import { Knex } from "knex";
import { GuildVariant, VariantRepository, Variant, VariantConfig, VariantWithConfig } from "@tf2qs/core";
import config from "config";

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

    async findAll(): Promise<GuildVariant[]> {
        const results = await this.dependencies.knex("guild_variants").select('*');
        return results.map(this.mapToGuildVariant);
    }

    async getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig> {
        const { variant, guildId } = params;

        if (guildId) {
            const guildVariant = await this.findByGuildIdAndName({
                guildId,
                variantName: variant,
            });

            if (guildVariant) {
                return this.mapGuildVariantToVariantConfig(guildVariant);
            }
        }

        const defaultConfig = this.getDefaultVariantConfig();
        try {
            const variantConfig = config.get<Partial<VariantConfig>>(`variants.${variant}`);
            return {
                ...defaultConfig,
                ...variantConfig,
                serverName: variant,
            };
        } catch (error) {
            return defaultConfig;
        }
    }

    async getVariantConfigs(params: { guildId?: string }): Promise<VariantWithConfig[]> {
        const { guildId } = params;

        if (!guildId) {
            const variants = config.get<Record<string, Partial<VariantConfig>>>(`variants`);
            const defaultConfig = this.getDefaultVariantConfig();
            return Object.keys(variants)
                .filter(it => it !== "default")
                .map(variant => ({
                    name: variant,
                    config: {
                        ...defaultConfig,
                        ...variants[variant],
                        serverName: variant,
                    },
                }));
        }

        const guildVariants = await this.findByGuildId({ guildId });
        const guildVariantConfigs = guildVariants.map(gv => ({
            name: gv.variantName,
            config: this.mapGuildVariantToVariantConfig(gv),
        }));

        const variants = config.get<Record<string, Partial<VariantConfig>>>(`variants`);
        const configVariants = Object.keys(variants)
            .filter(it => it !== "default")
            .map(variant => {
                const variantConfig = variants[variant];
                return {
                    name: variant,
                    config: {
                        ...this.getDefaultVariantConfig(),
                        ...variantConfig,
                        serverName: variant,
                    },
                    guildId: variantConfig.guildId,
                };
            });

        const guildSpecificConfigVariants = configVariants.filter(v => v.guildId === guildId);
        const defaultConfigVariants = configVariants.filter(v => !v.guildId);

        if (guildVariantConfigs.length > 0 || guildSpecificConfigVariants.length > 0) {
            return [...guildVariantConfigs, ...guildSpecificConfigVariants.map(v => ({ name: v.name, config: v.config }))];
        }

        return defaultConfigVariants.map(v => ({ name: v.name, config: v.config }));
    }

    private getDefaultVariantConfig(): VariantConfig {
        const defaultSettings = config.get<VariantConfig>(`variants.default`);
        return {
            ...defaultSettings,
            serverName: "default",
        };
    }

    private mapGuildVariantToVariantConfig(guildVariant: GuildVariant): VariantConfig {
        const defaultConfig = this.getDefaultVariantConfig();
        
        return {
            ...defaultConfig,
            displayName: guildVariant.displayName,
            hostname: guildVariant.hostname,
            defaultCfgs: guildVariant.defaultCfgs,
            admins: guildVariant.admins,
            image: guildVariant.image || defaultConfig.image,
            guildId: guildVariant.guildId,
            serverName: guildVariant.variantName,
        };
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
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
