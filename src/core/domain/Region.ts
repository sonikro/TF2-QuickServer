import config from "config";

export enum Region {
    SA_SAOPAULO_1 = "sa-saopaulo-1",
    SA_BOGOTA_1 = "sa-bogota-1",
    US_CHICAGO_1 = "us-chicago-1",
}

export type RegionConfig = {
    displayName: string;
    srcdsHostname: string;
    tvHostname: string;
}

export function isValidRegion(region: string): region is Region {
    return Object.values(Region).includes(region as Region);
}

export function getRegionConfig(region: Region): RegionConfig {
    const regionConfig = config.get<RegionConfig>(`regions.${region}`);
    return regionConfig;
}

export function getRegionDisplayName(region: Region): string {
    const regionConfig = getRegionConfig(region);
    return regionConfig.displayName;
}

/**
 * Retrieves a list of enabled regions based on the application's configuration.
 *
 * This function reads the region configurations from the application's settings,
 *  and returns an array of enabled regions.
 *
 * @returns {Region[]} An array of enabled regions.
 */
export function getRegions(): Region[] {
    const regions = config.get<Record<string, RegionConfig>>(`regions`);
    const enabledRegions = Object.entries(regions)
        .map(([region]) => region as Region);
    return enabledRegions;
}