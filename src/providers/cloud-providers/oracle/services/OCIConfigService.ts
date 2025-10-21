import { containerinstances, core } from "oci-sdk";
import { Region } from "../../../../core/domain";
import { ConfigManager } from "../../../../core/utils/ConfigManager";
import { OCICredentialsFactory } from "../../../../core/services/OCICredentialsFactory";

export type OCIConfigServiceDependencies = {
    configManager: ConfigManager;
    ociClientFactory: (region: Region) => {
        containerClient: containerinstances.ContainerInstanceClient;
        vncClient: core.VirtualNetworkClient;
    };
    ociCredentialsFactory: OCICredentialsFactory;
};

export class OCIConfigService {
    constructor(private readonly dependencies: OCIConfigServiceDependencies) {}

    getClients(params: { region: Region }) {
        return this.dependencies.ociClientFactory(params.region);
    }

    getOracleConfig() {
        return this.dependencies.configManager.getOracleConfig();
    }

    getOracleRegionConfig(params: { region: Region }) {
        const oracleConfig = this.getOracleConfig();
        const regionConfig = oracleConfig.regions[params.region];
        if (!regionConfig) {
            throw new Error(`Region ${params.region} is not configured in Oracle config`);
        }
        return regionConfig;
    }

    getOCICredentials(params: { region: Region }) {
        return this.dependencies.ociCredentialsFactory(params.region);
    }
}
