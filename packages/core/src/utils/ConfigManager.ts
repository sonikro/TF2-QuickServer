import { AWSConfig, DiscordConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "../domain";

export interface ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig;
    getRegionConfig(region: Region): RegionConfig;
    getOracleConfig(): OracleConfig;
    getAWSConfig(): AWSConfig;
    getDiscordConfig(): DiscordConfig;
}
