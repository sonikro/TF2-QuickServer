import config from "config";
import { CloudProvider } from "./CloudProvider";

export enum Region {
    SA_SAOPAULO_1 = "sa-saopaulo-1",
    SA_BOGOTA_1 = "sa-bogota-1",
    US_CHICAGO_1 = "us-chicago-1",
    SA_SANTIAGO_1 = "sa-santiago-1",
    EU_FRANKFURT_1 = "eu-frankfurt-1",
    AP_SYDNEY_1 = "ap-sydney-1",
    US_EAST_1_BUE_1 = "us-east-1-bue-1",
    US_EAST_1_LIM_1 = "us-east-1-lim-1",
}

export type RegionConfig = {
    displayName: string;
    srcdsHostname: string;
    tvHostname: string;
    cloudProvider: CloudProvider;
    homeRegion?: string;
    /**
     * How many minutes before the user's scheduled ready time the server should start being created.
     * @default 5
     */
    scheduledCreationLeadMinutes?: number;
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

/**
 * Gets the cloud provider for a specific region.
 * 
 * @param region - The region to check
 * @returns The cloud provider for the region
 */
export function getCloudProvider(region: Region): CloudProvider {
    const regionConfig = getRegionConfig(region);
    return regionConfig.cloudProvider;
}

/**
 * Gets the lead time in minutes before a scheduled server should start being created.
 *
 * @param region - The region to check
 * @returns The lead time in minutes (defaults to 5)
 */
export function getScheduledCreationLeadMinutes(region: Region): number {
    const regionConfig = getRegionConfig(region);
    return regionConfig.scheduledCreationLeadMinutes ?? 5;
}