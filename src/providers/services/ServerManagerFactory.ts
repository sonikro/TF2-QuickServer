import { Region, isAWSRegion } from "../../core/domain";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { PasswordGeneratorService } from "../../core/services/PasswordGeneratorService";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { defaultAWSServiceFactory } from "./defaultAWSServiceFactory";
import { defaultOracleServiceFactory } from "./defaultOracleServiceFactory";
import { ECSServerManagerFactory } from "../cloud-providers/aws/ECSServerManagerFactory";
import { OCIServerManager } from "../cloud-providers/oracle/OCIServerManager";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";
import { Chance } from "chance";

const chance = new Chance();

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
        // Strategy pattern: Choose server manager based on region
        if (isAWSRegion(region)) {
            // Use the new ECSServerManager architecture
            return ECSServerManagerFactory.createServerManager({
                configManager: this.dependencies.configManager,
                awsClientFactory: defaultAWSServiceFactory,
                serverCommander: this.dependencies.serverCommander,
                passwordGeneratorService: this.dependencies.passwordGeneratorService,
                chance: chance
            });
        } else {
            return new OCIServerManager({
                serverCommander: this.dependencies.serverCommander,
                configManager: this.dependencies.configManager,
                passwordGeneratorService: this.dependencies.passwordGeneratorService,
                ociClientFactory: defaultOracleServiceFactory,
                serverAbortManager: this.dependencies.serverAbortManager,
                ociCredentialsFactory: this.dependencies.ociCredentialsFactory,
            });
        }
    }
}
