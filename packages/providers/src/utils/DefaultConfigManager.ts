import { AWSConfig, DiscordConfig, getAWSConfig, getDiscordConfig, getOracleConfig, getRegionConfig, getVariantConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";

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
}
export const defaultConfigManager = new DefaultConfigManager();
