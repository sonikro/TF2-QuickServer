import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { CsvUserBanRepository } from "./CsvUserBanRepository";
import fs from "fs";
import path from "path";
import os from "os";

describe("CsvUserBanRepository", () => {
    let tempCsvPath: string;
    let tempDir: string;

    beforeEach(() => {
        // Create a temporary directory and CSV file for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bans-test-"));
        tempCsvPath = path.join(tempDir, "bans.csv");
    });

    afterEach(() => {
        // Clean up temporary files
        if (fs.existsSync(tempCsvPath)) {
            fs.unlinkSync(tempCsvPath);
        }
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    });

    function createTestCsv(content: string) {
        fs.writeFileSync(tempCsvPath, content, "utf-8");
    }

    describe("isUserBanned", () => {
        it("should return isBanned true when user is in the ban list by steam_id", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,2025-01-01 00:00:00,Test ban"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // When
            const result = await repository.isUserBanned("U:1:123456");

            // Then
            expect(result.isBanned).toBe(true);
            expect(result.reason).toBe("Test ban");
        });

        it("should return isBanned false when user is not in the ban list", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,2025-01-01 00:00:00,Test ban"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // When
            const result = await repository.isUserBanned("U:1:999999");

            // Then
            expect(result.isBanned).toBe(false);
            expect(result.reason).toBeUndefined();
        });

        it("should return isBanned true when user is in the ban list by discord_user_id", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,discord123,2025-01-01 00:00:00,Test ban"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // When
            const result = await repository.isUserBanned("U:1:999999", "discord123");

            // Then
            expect(result.isBanned).toBe(true);
            expect(result.reason).toBe("Test ban");
        });

        it("should reload bans when CSV file is modified", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,2025-01-01 00:00:00,Test ban"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // First check - user should be banned
            const result1 = await repository.isUserBanned("U:1:123456");
            expect(result1.isBanned).toBe(true);

            // Wait a bit to ensure file modification time will be different
            await new Promise(resolve => setTimeout(resolve, 10));

            // When - modify the CSV file to remove the ban
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:999999,,2025-01-01 00:00:00,Different ban"
            );

            // Wait a bit to ensure file system updates the modification time
            await new Promise(resolve => setTimeout(resolve, 10));

            // Then - user should no longer be banned
            const result2 = await repository.isUserBanned("U:1:123456");
            expect(result2.isBanned).toBe(false);
        });

        it("should load new bans when CSV file is modified with additions", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,2025-01-01 00:00:00,Test ban"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // First check - new user should not be banned
            const result1 = await repository.isUserBanned("U:1:789012");
            expect(result1.isBanned).toBe(false);

            // Wait a bit to ensure file modification time will be different
            await new Promise(resolve => setTimeout(resolve, 10));

            // When - modify the CSV file to add a new ban
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,2025-01-01 00:00:00,Test ban\n" +
                "U:1:789012,,2025-01-01 00:00:00,New ban"
            );

            // Wait a bit to ensure file system updates the modification time
            await new Promise(resolve => setTimeout(resolve, 10));

            // Then - new user should now be banned
            const result2 = await repository.isUserBanned("U:1:789012");
            expect(result2.isBanned).toBe(true);
            expect(result2.reason).toBe("New ban");
        });

        it("should handle empty CSV file gracefully", async () => {
            // Given
            createTestCsv("steam_id,discord_user_id,created_at,reason\n");
            const repository = new CsvUserBanRepository(tempCsvPath);

            // When
            const result = await repository.isUserBanned("U:1:123456");

            // Then
            expect(result.isBanned).toBe(false);
        });

        it("should handle missing reason field", async () => {
            // Given
            createTestCsv(
                "steam_id,discord_user_id,created_at,reason\n" +
                "U:1:123456,,,\n"
            );
            const repository = new CsvUserBanRepository(tempCsvPath);

            // When
            const result = await repository.isUserBanned("U:1:123456");

            // Then
            expect(result.isBanned).toBe(true);
            expect(result.reason).toBeUndefined();
        });
    });
});
