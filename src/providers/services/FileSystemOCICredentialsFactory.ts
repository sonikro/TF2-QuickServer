import {readFileSync} from "fs"
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";

export const FileSystemOCICredentialsFactory: OCICredentialsFactory = (region) => {
    const configFilePath = process.env.OCI_CONFIG_FILE
    if (!configFilePath) {
        throw new Error("OCI_CONFIG_FILE environment variable is not set");
    }

    // Read config file
    const configFileContent = readFileSync(configFilePath, "utf-8");
    const sections = parseConfigFile(configFileContent);
    const regionSection = sections[region];
    if (!regionSection) {
        throw new Error(`Region section not found in config file: ${region}`);
    }

    // Extract private key file path
    const keyFilePath = regionSection.key_file;
    if (!keyFilePath) {
        throw new Error(`Key file path not found for region: ${region}`);
    }
    // Read private key file
     const privateKeyFileContent = readFileSync(keyFilePath, "utf-8");

     const defaultConfigfile = `[DEFAULT]
${Object.entries(regionSection)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}`;

    return {
        configFileContent: defaultConfigfile,
        privateKeyFileContent,
    };
};

function parseConfigFile(content: string): Record<string, Record<string, string>> {
    const sections: Record<string, Record<string, string>> = {};
    const lines = content.split("\n");
    let currentSection: string | null = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
            currentSection = trimmedLine.slice(1, -1);
            sections[currentSection] = {};
        } else if (currentSection && trimmedLine.includes("=")) {
            const [key, value] = trimmedLine.split("=").map(part => part.trim());
            sections[currentSection][key] = value;
        }
    }

    return sections;
}