import { describe, expect, it } from "vitest";
import { Region, getCloudProvider } from "./Region";
import { CloudProvider } from "./CloudProvider";

describe('Region utilities', () => {
    describe('getCloudProvider', () => {
        it('should be consistent with region classification', () => {
            // Test all enum values to ensure we have explicit handling
            const allRegions = Object.values(Region);
            const awsRegions = allRegions.filter(region => getCloudProvider(region) === CloudProvider.AWS);
            const oracleRegions = allRegions.filter(region => getCloudProvider(region) === CloudProvider.ORACLE);

            // Currently only Buenos Aires and Lima are AWS
            expect(awsRegions).toEqual([Region.US_EAST_1_BUE_1A, Region.US_EAST_1_LIM_1A]);

            // All other regions should be Oracle Cloud
            expect(oracleRegions).toEqual([
                Region.SA_SAOPAULO_1,
                Region.SA_BOGOTA_1,
                Region.US_CHICAGO_1,
                Region.SA_SANTIAGO_1,
                Region.EU_FRANKFURT_1,
            ]);

            // Total should match enum size
            expect(awsRegions.length + oracleRegions.length).toBe(allRegions.length);
        });
    });
});
