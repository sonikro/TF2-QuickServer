import { DiscordConfig, Region, RegionConfig, Variant, VariantConfig } from "../domain";
import { OracleConfig } from "../domain/OracleConfig";

export interface ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig;
    getRegionConfig(region: Region): RegionConfig;
    getOracleConfig(): OracleConfig;
    getDiscordConfig(): DiscordConfig;
}