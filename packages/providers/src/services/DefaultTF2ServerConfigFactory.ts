import {
    DeploymentContext,
    EnvironmentBuilderService,
    PasswordGeneratorService,
    RegionConfig,
    ServerCredentials,
    TF2ServerConfig,
    TF2ServerConfigFactory,
    VariantConfig,
} from '@tf2qs/core';

/**
 * Default implementation of TF2ServerConfigFactory.
 * Generates credentials, builds environment variables, and resolves
 * all TF2-server-specific parameters from deployment context and config.
 */
export class DefaultTF2ServerConfigFactory implements TF2ServerConfigFactory {
    constructor(
        private readonly passwordGeneratorService: PasswordGeneratorService,
        private readonly environmentBuilderService: EnvironmentBuilderService,
    ) {}

    async build(
        context: DeploymentContext,
        variantConfig: VariantConfig,
        regionConfig: RegionConfig,
    ): Promise<TF2ServerConfig> {
        const credentials = ServerCredentials.generate(this.passwordGeneratorService);
        const environmentVariables = this.environmentBuilderService.build(
            context,
            credentials,
            variantConfig,
            regionConfig,
        );

        const containerImage = variantConfig.image;
        const startupMap = context.firstMap ?? variantConfig.map;
        const maxPlayers = variantConfig.maxPlayers;
        const svPure = variantConfig.svPure;

        const containerArgs = [
            "-enablefakeip",
            "+sv_pure",
            svPure.toString(),
            "+maxplayers",
            maxPlayers.toString(),
            "+map",
            startupMap,
            "+log",
            "on",
            "+logaddress_add",
            process.env.SRCDS_LOG_ADDRESS || "",
            "+sv_logsecret",
            credentials.logSecret.toString(),
        ];

        return new TF2ServerConfig({
            credentials,
            environmentVariables,
            containerImage,
            startupMap,
            maxPlayers,
            svPure,
            containerArgs,
        });
    }
}
