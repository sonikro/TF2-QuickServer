import { AWSConfig, CreditsConfig, DiscordConfig, getAWSConfig, getCreditsConfig, getDiscordConfig, getOracleConfig, getRegionConfig, getVariantConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";

export class DefaultConfigManager implements ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig {
        try {
            return getVariantConfig(variant);
        } catch (error) {
            return getVariantConfig("default");
        }
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