import { Region } from "../../core/domain";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";
import { defaultAWSServiceFactory } from "./defaultAWSServiceFactory";
import { defaultOracleServiceFactory } from "./defaultOracleServiceFactory";
import { ECSServerManager } from "./ECSServerManager";
import { OCIServerManager } from "./OCIServerManager";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";

export interface ServerManagerFactory {
    createServerManager(region: Region): ServerManager;
}

export class DefaultServerManagerFactory implements ServerManagerFactory {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGenerator: PasswordGenerator;
            serverAbortManager: ServerAbortManager;
            ociCredentialsFactory: OCICredentialsFactory;
        }
    ) { }

    createServerManager(region: Region): ServerManager {
        // Strategy pattern: Choose server manager based on region
        if (this.isAWSRegion(region)) {
            return new ECSServerManager({
                serverCommander: this.dependencies.serverCommander,
                configManager: this.dependencies.configManager,
                passwordGenerator: this.dependencies.passwordGenerator,
                awsClientFactory: defaultAWSServiceFactory,
                serverAbortManager: this.dependencies.serverAbortManager,
            });
        } else {
            return new OCIServerManager({
                serverCommander: this.dependencies.serverCommander,
                configManager: this.dependencies.configManager,
                passwordGenerator: this.dependencies.passwordGenerator,
                ociClientFactory: defaultOracleServiceFactory,
                serverAbortManager: this.dependencies.serverAbortManager,
                ociCredentialsFactory: this.dependencies.ociCredentialsFactory,
            });
        }
    }

    private isAWSRegion(region: Region): boolean {
        // Define which regions use AWS ECS
        const awsRegions: Region[] = [
            Region.US_EAST_1_BUE_1A, // Buenos Aires region uses AWS
        ];
        
        return awsRegions.includes(region);
    }
}
