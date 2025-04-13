import { Variant, VariantConfig, Region, RegionConfig, CdkConfig, getCdkConfig, getVariantConfig, getRegionConfig, DiscordConfig, getDiscordConfig } from "../../core/domain";
import { ConfigManager } from "../../core/utils/ConfigManager";

export class DefaultConfigManager implements ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig {
        return getVariantConfig(variant)
    }
    getRegionConfig(region: Region): RegionConfig {
        return getRegionConfig(region)
    }
    getCdkConfig(): CdkConfig {
        return getCdkConfig()
    }
    getDiscordConfig(): DiscordConfig {
        return getDiscordConfig()
    }
}
export const defaultConfigManager = new DefaultConfigManager();