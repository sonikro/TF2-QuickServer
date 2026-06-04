import { DeploymentContext } from '../models/DeploymentContext';
import { TF2ServerConfig } from '../models/TF2ServerConfig';
import { VariantConfig, RegionConfig } from '../domain';

/**
 * Factory responsible for assembling all TF2-server-specific parameters
 * (credentials, environment variables, container image, startup map, args, etc.)
 * from deployment context and configuration. Cloud provider managers consume
 * the resulting TF2ServerConfig and map it to their own API schemas.
 */
export interface TF2ServerConfigFactory {
    build(
        context: DeploymentContext,
        variantConfig: VariantConfig,
        regionConfig: RegionConfig,
    ): Promise<TF2ServerConfig>;
}
