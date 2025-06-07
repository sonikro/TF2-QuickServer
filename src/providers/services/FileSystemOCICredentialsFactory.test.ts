import * as fs from "fs";
import { FileSystemOCICredentialsFactory } from "./FileSystemOCICredentialsFactory";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Region } from "../../core/domain/Region";

const mockConfig = `
[sa-saopaulo-1]
user=ocid1.user.oc1..aaaa
fingerprint=ed:5c:5c
region=sa-saopaulo-1
key_file=/mock/path/oci.pem

[us-chicago-1]
user=ocid1.user.oc1..bbbb
fingerprint=ed:5c:5c
region=us-chicago-1
key_file=/mock/path/oci.pem
`;

const mockKey = "MOCK_PRIVATE_KEY_CONTENT";

vi.mock("fs", () => ({
    readFileSync: vi.fn(),
}));

describe("FileSystemOCICredentialsFactory", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
            if (filePath.includes("config")) return mockConfig;
            if (filePath.includes("oci.pem")) return mockKey;
            throw new Error("Unexpected file path: " + filePath);
        });
    });

    it("should extract the correct region section and private key", () => {
        process.env.OCI_CONFIG_FILE = "/mock/path/config";
        const creds = FileSystemOCICredentialsFactory(Region.US_CHICAGO_1);
        expect(creds.configFileContent).toContain("[DEFAULT]");
        expect(creds.configFileContent).toContain("region=us-chicago-1");
        expect(creds.privateKeyFileContent).toBe(mockKey);
    });

    it("should throw if region is not found", () => {
        
        vi.spyOn(fs, "readFileSync").mockReturnValue(mockConfig);
        process.env.OCI_CONFIG_FILE = "/mock/path/config";
        expect(() => FileSystemOCICredentialsFactory("not-a-region" as Region)).toThrow();
    });

    it("should throw if key_file is missing", () => {
        const badConfig = `\n[us-chicago-1]\nregion=us-chicago-1\n`;
        vi.spyOn(fs, "readFileSync").mockReturnValue(badConfig);
        process.env.OCI_CONFIG_FILE = "/mock/path/config";
        expect(() => FileSystemOCICredentialsFactory(Region.US_CHICAGO_1)).toThrow();
    });
});
