import { CloudProvider, Region, getCloudProvider } from "@tf2qs/core/src/domain";
import { OCICredentialsFactory } from "@tf2qs/core/src/services/OCICredentialsFactory";
import { PasswordGeneratorService } from "@tf2qs/core/src/services/PasswordGeneratorService";
import { ServerAbortManager } from "@tf2qs/core/src/services/ServerAbortManager";
import { ServerCommander } from "@tf2qs/core/src/services/ServerCommander";
import { ServerManager } from "@tf2qs/core/src/services/ServerManager";
import { ConfigManager } from "@tf2qs/core/src/utils/ConfigManager";
import { AWSServerManager } from "../cloud-providers";
import { OCIServerManager } from "../cloud-providers/oracle/OCIServerManager";
import { defaultAWSServiceFactory } from "./defaultAWSServiceFactory";
import { defaultOracleServiceFactory } from "./defaultOracleServiceFactory";

export interface ServerManagerFactory {
    createServerManager(region: Region): ServerManager;
}

export class DefaultServerManagerFactory implements ServerManagerFactory {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGeneratorService: PasswordGeneratorService;
            serverAbortManager: ServerAbortManager;
            ociCredentialsFactory: OCICredentialsFactory;
        }
    ) { }

    createServerManager(region: Region): ServerManager {
        // Strategy pattern: Choose server manager based on region's cloud provider
        const cloudProvider = getCloudProvider(region);

        switch (cloudProvider) {
            case CloudProvider.AWS:
                return AWSServerManager.create({
                    configManager: this.dependencies.configManager,
                    awsClientFactory: defaultAWSServiceFactory,
                    serverCommander: this.dependencies.serverCommander,
                    passwordGeneratorService: this.dependencies.passwordGeneratorService,
                });
            case CloudProvider.ORACLE:
                return new OCIServerManager({
                    serverCommander: this.dependencies.serverCommander,
                    configManager: this.dependencies.configManager,
                    passwordGeneratorService: this.dependencies.passwordGeneratorService,
                    ociClientFactory: defaultOracleServiceFactory,
                    serverAbortManager: this.dependencies.serverAbortManager,
                    ociCredentialsFactory: this.dependencies.ociCredentialsFactory,
                });
            default:
                throw new Error(`Unsupported cloud provider: ${cloudProvider} for region: ${region}`);
        }
    }
}
