import config from "config";

export enum Region {
    US_EAST_1 = "us-east-1",
    US_EAST_2 = "us-east-2",
    US_WEST_1 = "us-west-1",
    US_WEST_2 = "us-west-2",
    CA_CENTRAL_1 = "ca-central-1",
    CA_WEST_1 = "ca-west-1",
    CN_NORTH_1 = "cn-north-1",
    CN_NORTHWEST_1 = "cn-northwest-1",
    EU_CENTRAL_1 = "eu-central-1",
    EU_CENTRAL_2 = "eu-central-2",
    EU_WEST_1 = "eu-west-1",
    EU_WEST_2 = "eu-west-2",
    EU_WEST_3 = "eu-west-3",
    EU_SOUTH_1 = "eu-south-1",
    EU_SOUTH_2 = "eu-south-2",
    EU_NORTH_1 = "eu-north-1",
    IL_CENTRAL_1 = "il-central-1",
    ME_SOUTH_1 = "me-south-1",
    ME_CENTRAL_1 = "me-central-1",
    AP_EAST_1 = "ap-east-1",
    AP_SOUTH_1 = "ap-south-1",
    AP_SOUTH_2 = "ap-south-2",
    AP_NORTHEAST_1 = "ap-northeast-1",
    AP_NORTHEAST_2 = "ap-northeast-2",
    AP_NORTHEAST_3 = "ap-northeast-3",
    AP_SOUTHEAST_1 = "ap-southeast-1",
    AP_SOUTHEAST_2 = "ap-southeast-2",
    AP_SOUTHEAST_3 = "ap-southeast-3",
    AP_SOUTHEAST_4 = "ap-southeast-4",
    AP_SOUTHEAST_5 = "ap-southeast-5",
    SA_EAST_1 = "sa-east-1",
    AF_SOUTH_1 = "af-south-1"
}

export const RegionNames: Record<Region, string> = {
    [Region.US_EAST_1]: "US - N. Virginia",
    [Region.US_EAST_2]: "US - Ohio",
    [Region.US_WEST_1]: "US - N. California",
    [Region.US_WEST_2]: "US - Oregon",
    [Region.CA_CENTRAL_1]: "CA - Central",
    [Region.CA_WEST_1]: "CA - Calgary",
    [Region.CN_NORTH_1]: "CN - Beijing",
    [Region.CN_NORTHWEST_1]: "CN - Ningxia",
    [Region.EU_CENTRAL_1]: "EU - Frankfurt",
    [Region.EU_CENTRAL_2]: "EU - Zurich",
    [Region.EU_WEST_1]: "EU - Ireland",
    [Region.EU_WEST_2]: "EU - London",
    [Region.EU_WEST_3]: "EU - Paris",
    [Region.EU_SOUTH_1]: "EU - Milan",
    [Region.EU_SOUTH_2]: "EU - Spain",
    [Region.EU_NORTH_1]: "EU - Stockholm",
    [Region.IL_CENTRAL_1]: "IL - Tel Aviv",
    [Region.ME_SOUTH_1]: "ME - Bahrain",
    [Region.ME_CENTRAL_1]: "ME - UAE",
    [Region.AP_EAST_1]: "AP - Hong Kong",
    [Region.AP_SOUTH_1]: "AP - Mumbai",
    [Region.AP_SOUTH_2]: "AP - Hyderabad",
    [Region.AP_NORTHEAST_1]: "AP - Tokyo",
    [Region.AP_NORTHEAST_2]: "AP - Seoul",
    [Region.AP_NORTHEAST_3]: "AP - Osaka",
    [Region.AP_SOUTHEAST_1]: "AP - Singapore",
    [Region.AP_SOUTHEAST_2]: "AP - Jakarta",
    [Region.AP_SOUTHEAST_3]: "AP - Kuala Lumpur",
    [Region.AP_SOUTHEAST_4]: "AP - Melbourne",
    [Region.AP_SOUTHEAST_5]: "AP - Auckland",
    [Region.SA_EAST_1]: "SA - São Paulo",
    [Region.AF_SOUTH_1]: "AF - Cape Town"
};

export type RegionConfig = {
    enabled: boolean;
    srcdsHostname: string;
    tvHostname: string;
}

export function isValidRegion(region: string): region is Region {
    return Object.values(Region).includes(region as Region);
}

export function getRegionConfig(region: Region): RegionConfig {
    const regionConfig = config.get<RegionConfig>(`aws.regions.${region}`);
    return regionConfig;
}


/**
 * Retrieves a list of enabled AWS regions based on the application's configuration.
 *
 * This function reads the AWS region configurations from the application's settings,
 * filters out the regions that are not enabled, and returns an array of enabled regions.
 *
 * @returns {Region[]} An array of enabled AWS regions.
 */
export function getEnabledRegions(): Region[] {
    const regions = config.get<Record<string, RegionConfig>>(`aws.regions`);
    const enabledRegions = Object.entries(regions)
        .filter(([_, regionConfig]) => regionConfig.enabled)
        .map(([region]) => region as Region);
    return enabledRegions;
}