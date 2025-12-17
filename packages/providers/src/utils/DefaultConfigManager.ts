import { AWSConfig, CreditsConfig, DiscordConfig, getAWSConfig, getCreditsConfig, getDiscordConfig, getOracleConfig, getRegionConfig, OracleConfig, Region, RegionConfig, Variant, VariantConfig, VariantRepository } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";

export class DefaultConfigManager implements ConfigManager {
    constructor(private readonly dependencies: {
        variantRepository: VariantRepository;
    }) {}

    async getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig> {
        return await this.dependencies.variantRepository.getVariantConfig(params);
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