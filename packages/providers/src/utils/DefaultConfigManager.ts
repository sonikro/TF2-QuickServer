import { AWSConfig, DiscordConfig, getAWSConfig, getDiscordConfig, getGithubConfig, getMoneyConfig, getOracleConfig, getRegionConfig, getVariantConfig, GithubConfig, MoneyConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "@tf2qs/core";
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
    getGithubConfig(): GithubConfig {
        return getGithubConfig();
    }
    getMoneyConfig(): MoneyConfig {
        return getMoneyConfig();
    }
}
export const defaultConfigManager = new DefaultConfigManager();
