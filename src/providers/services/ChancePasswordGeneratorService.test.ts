import { beforeEach, describe, expect, it } from "vitest";
import { ChancePasswordGeneratorService } from "./ChancePasswordGeneratorService";

describe("ChancePasswordGeneratorService", () => {
    let service: ChancePasswordGeneratorService;

    beforeEach(() => {
        service = new ChancePasswordGeneratorService();
    });

    describe("constructor", () => {
        it("should create an instance", () => {
            expect(service).toBeInstanceOf(ChancePasswordGeneratorService);
        });
    });

    describe("generatePassword", () => {
        it("should generate password with default settings", () => {
            const result = service.generatePassword({});

            expect(typeof result).toBe("string");
            expect(result.length).toBe(12);
            // Should contain alphanumeric and symbols by default
            expect(/[a-zA-Z]/.test(result)).toBe(true);
        });

        it("should generate password with custom length", () => {
            const result = service.generatePassword({ length: 8 });

            expect(typeof result).toBe("string");
            expect(result.length).toBe(8);
        });

        it("should generate password with only alpha characters when numeric and symbols disabled", () => {
            const result = service.generatePassword({ 
                length: 20,
                alpha: true,
                numeric: false, 
                symbols: false 
            });

            expect(typeof result).toBe("string");
            expect(result.length).toBe(20);
            expect(/^[a-zA-Z]+$/.test(result)).toBe(true);
        });

        it("should generate password with only numeric characters when alpha and symbols disabled", () => {
            const result = service.generatePassword({ 
                length: 15,
                alpha: false,
                numeric: true, 
                symbols: false 
            });

            expect(typeof result).toBe("string");
            expect(result.length).toBe(15);
            expect(/^[0-9]+$/.test(result)).toBe(true);
        });

        it("should generate different passwords on multiple calls", () => {
            const result1 = service.generatePassword({ length: 10 });
            const result2 = service.generatePassword({ length: 10 });

            expect(result1).not.toBe(result2);
            expect(result1.length).toBe(10);
            expect(result2.length).toBe(10);
        });

        it("should respect all settings together", () => {
            const result = service.generatePassword({
                length: 6,
                alpha: true,
                numeric: true,
                symbols: false
            });

            expect(typeof result).toBe("string");
            expect(result.length).toBe(6);
            // Should only contain alphanumeric characters
            expect(/^[a-zA-Z0-9]+$/.test(result)).toBe(true);
        });
    });

    describe("generateNumericPassword", () => {
        it("should generate numeric password within given range", () => {
            const result = service.generateNumericPassword({ min: 1, max: 999999 });

            expect(typeof result).toBe("number");
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(999999);
            expect(Number.isInteger(result)).toBe(true);
        });

        it("should generate numeric password within different range", () => {
            const result = service.generateNumericPassword({ min: 100, max: 200 });

            expect(typeof result).toBe("number");
            expect(result).toBeGreaterThanOrEqual(100);
            expect(result).toBeLessThanOrEqual(200);
            expect(Number.isInteger(result)).toBe(true);
        });

        it("should generate different numbers on multiple calls", () => {
            const results = new Set();
            
            // Generate 10 numbers and check they're not all the same
            for (let i = 0; i < 10; i++) {
                const result = service.generateNumericPassword({ min: 1, max: 1000 });
                results.add(result);
            }

            // Should have some variety (not all identical)
            expect(results.size).toBeGreaterThan(1);
        });

        it("should handle single value range", () => {
            const result = service.generateNumericPassword({ min: 42, max: 42 });

            expect(result).toBe(42);
        });
    });
});
