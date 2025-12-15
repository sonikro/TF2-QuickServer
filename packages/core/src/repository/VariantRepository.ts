import { GuildVariant } from "../domain/GuildVariant";

export interface VariantRepository {
    create(params: { variant: GuildVariant }): Promise<GuildVariant>;
    findByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<GuildVariant | null>;
    findByGuildId(params: { guildId: string }): Promise<GuildVariant[]>;
    deleteByGuildIdAndName(params: { guildId: string; variantName: string }): Promise<void>;
}
