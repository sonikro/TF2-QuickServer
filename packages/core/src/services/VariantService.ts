import { Variant, VariantConfig } from "../domain/Variant";
import { VariantRepository } from "../repository/VariantRepository";

export type VariantWithConfig = {
    name: string;
    config: VariantConfig;
}

export interface VariantService {
    getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig>;
    getVariantConfigs(params: { guildId?: string }): Promise<VariantWithConfig[]>;
}
