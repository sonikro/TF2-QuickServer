import { CloudProvider, Region, getCloudProvider } from "../../core/domain";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";
import { PasswordGeneratorService } from "../../core/services/PasswordGeneratorService";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { ECSServerManagerFactory } from "../cloud-providers/aws/ECSServerManagerFactory";
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
                return ECSServerManagerFactory.createServerManager({
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
