import { AWSConfig, CreditsConfig, DiscordConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "../domain";

export interface ConfigManager {
    getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig>;
    getRegionConfig(region: Region): RegionConfig;
    getOracleConfig(): OracleConfig;
    getAWSConfig(): AWSConfig;
    getDiscordConfig(): DiscordConfig;
    getCreditsConfig(): CreditsConfig;
}