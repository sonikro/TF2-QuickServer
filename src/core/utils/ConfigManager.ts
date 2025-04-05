import { CdkConfig, Region, RegionConfig, Variant, VariantConfig } from "../domain";

export interface ConfigManager {
    getVariantConfig(variant: Variant): VariantConfig;
    getRegionConfig(region: Region): RegionConfig;
    getCdkConfig(): CdkConfig;
}