import { describe, expect, it } from "vitest";
import { CloudProvider, isValidCloudProvider } from "./CloudProvider";

describe('CloudProvider utilities', () => {
    describe('CloudProvider enum', () => {
        it('should have AWS and ORACLE values', () => {
            expect(CloudProvider.AWS).toBe("aws");
            expect(CloudProvider.ORACLE).toBe("oracle");
        });

        it('should contain all expected providers', () => {
            const values = Object.values(CloudProvider);
            expect(values).toEqual(["aws", "oracle"]);
        });
    });

    describe('isValidCloudProvider', () => {
        it('should return true for valid cloud providers', () => {
            expect(isValidCloudProvider("aws")).toBe(true);
            expect(isValidCloudProvider("oracle")).toBe(true);
        });

        it('should return false for invalid cloud providers', () => {
            expect(isValidCloudProvider("invalid")).toBe(false);
            expect(isValidCloudProvider("gcp")).toBe(false);
            expect(isValidCloudProvider("azure")).toBe(false);
            expect(isValidCloudProvider("")).toBe(false);
        });

        it('should be case sensitive', () => {
            expect(isValidCloudProvider("AWS")).toBe(false);
            expect(isValidCloudProvider("Oracle")).toBe(false);
            expect(isValidCloudProvider("ORACLE")).toBe(false);
        });
    });
});
