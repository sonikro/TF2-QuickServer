import { AWSConfig, CreditsConfig, DiscordConfig, getAWSConfig, getCreditsConfig, getDiscordConfig, getOracleConfig, getRegionConfig, getVariantConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "../../core/domain";
import { ConfigManager } from "../../core/utils/ConfigManager";

export class DefaultConfigManager implements ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig {
        return getVariantConfig(variant)
    }
    getRegionConfig(region: Region): RegionConfig {
        return getRegionConfig(region)
    }
    getDiscordConfig(): DiscordConfig {
        return getDiscordConfig()
    }
    getOracleConfig(): OracleConfig {
        return getOracleConfig();
    }
    getAWSConfig(): AWSConfig {
        return getAWSConfig();
    }
    getCreditsConfig(): CreditsConfig {
        return getCreditsConfig();
    }
}
export const defaultConfigManager = new DefaultConfigManager();