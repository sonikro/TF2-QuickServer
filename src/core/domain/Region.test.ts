import { describe, expect, it } from "vitest";
import { Region, isAWSRegion } from "./Region";

describe('Region utilities', () => {
    describe('isAWSRegion', () => {
        it('should return true for AWS Local Zone regions', () => {
            expect(isAWSRegion(Region.US_EAST_1_BUE_1A)).toBe(true);
        });

        it('should return false for Oracle Cloud regions', () => {
            expect(isAWSRegion(Region.SA_SAOPAULO_1)).toBe(false);
            expect(isAWSRegion(Region.SA_BOGOTA_1)).toBe(false);
            expect(isAWSRegion(Region.US_CHICAGO_1)).toBe(false);
            expect(isAWSRegion(Region.SA_SANTIAGO_1)).toBe(false);
            expect(isAWSRegion(Region.EU_FRANKFURT_1)).toBe(false);
        });

        it('should be consistent with region classification', () => {
            // Test all enum values to ensure we have explicit handling
            const allRegions = Object.values(Region);
            const awsRegions = allRegions.filter(isAWSRegion);
            const ociRegions = allRegions.filter(region => !isAWSRegion(region));

            // Currently only Buenos Aires is AWS
            expect(awsRegions).toEqual([Region.US_EAST_1_BUE_1A]);
            
            // All other regions should be Oracle Cloud
            expect(ociRegions).toEqual([
                Region.SA_SAOPAULO_1,
                Region.SA_BOGOTA_1,
                Region.US_CHICAGO_1,
                Region.SA_SANTIAGO_1,
                Region.EU_FRANKFURT_1,
            ]);

            // Total should match enum size
            expect(awsRegions.length + ociRegions.length).toBe(allRegions.length);
        });
    });
});
