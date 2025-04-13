import { CdkConfig, Region, RegionConfig, Variant, VariantConfig, DiscordConfig} from "../domain";

export interface ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig;
    getRegionConfig(region: Region): RegionConfig;
    getCdkConfig(): CdkConfig;
    getDiscordConfig(): DiscordConfig;
}