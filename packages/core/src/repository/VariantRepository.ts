import { GuildVariant } from "../domain/GuildVariant";
import { Variant, VariantConfig } from "../domain/Variant";

export type VariantWithConfig = {
    name: string;
    config: VariantConfig;
}

export interface VariantRepository {
    create(params: { variant: GuildVariant }): Promise<GuildVariant>;
    findByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<GuildVariant | null>;
    findByGuildId(params: { guildId: string }): Promise<GuildVariant[]>;
    deleteByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<void>;
    getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig>;
    getVariantConfigs(params: { guildId?: string }): Promise<VariantWithConfig[]>;
    findAll(): Promise<GuildVariant[]>;
}
