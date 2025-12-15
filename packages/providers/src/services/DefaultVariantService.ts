import { Variant, VariantConfig, VariantRepository, VariantService, VariantWithConfig, getVariantConfig, getVariantConfigs } from "@tf2qs/core";

export class DefaultVariantService implements VariantService {
    constructor(private readonly dependencies: {
        variantRepository: VariantRepository;
    }) {}

    async getVariantConfig(params: { variant: Variant; guildId?: string }): Promise<VariantConfig> {
        const { variant, guildId } = params;

        if (guildId) {
            const guildVariant = await this.dependencies.variantRepository.findByGuildIdAndName({
                guildId,
                variantName: variant,
            });

            if (guildVariant) {
                return this.mapGuildVariantToVariantConfig(guildVariant);
            }
        }

        return getVariantConfig(variant);
    }

    async getVariantConfigs(params: { guildId?: string }): Promise<VariantWithConfig[]> {
        const { guildId } = params;
        const configVariants = getVariantConfigs();

        if (!guildId) {
            return configVariants;
        }

        const guildVariants = await this.dependencies.variantRepository.findByGuildId({ guildId });
        
        const guildVariantConfigs = guildVariants.map(gv => ({
            name: gv.variantName,
            config: this.mapGuildVariantToVariantConfig(gv),
        }));

        const guildSpecificConfigVariants = configVariants.filter(v => v.config.guildId === guildId);
        const defaultConfigVariants = configVariants.filter(v => !v.config.guildId);

        if (guildVariantConfigs.length > 0 || guildSpecificConfigVariants.length > 0) {
            return [...guildVariantConfigs, ...guildSpecificConfigVariants];
        }

        return defaultConfigVariants;
    }

    private mapGuildVariantToVariantConfig(guildVariant: any): VariantConfig {
        const defaultConfig = getVariantConfig("default");
        
        return {
            ...defaultConfig,
            displayName: guildVariant.displayName,
            hostname: guildVariant.hostname,
            defaultCfgs: guildVariant.defaultCfgs,
            admins: guildVariant.admins,
            image: guildVariant.image || defaultConfig.image,
            emptyMinutesTerminate: guildVariant.emptyMinutesTerminate,
            guildId: guildVariant.guildId,
            serverName: guildVariant.variantName,
            ocpu: defaultConfig.ocpu,
            memory: defaultConfig.memory,
            maxPlayers: defaultConfig.maxPlayers,
            map: defaultConfig.map,
            svPure: defaultConfig.svPure,
            shape: defaultConfig.shape,
        };
    }
}
