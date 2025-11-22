import { ServerCredentials } from '../models/ServerCredentials';
import { DeploymentContext } from '../models/DeploymentContext';
import { VariantConfig, RegionConfig } from '../domain';

/**
 * Service responsible for building environment variables for containers
 */
export interface EnvironmentBuilderService {
    build(
        context: DeploymentContext,
        credentials: ServerCredentials,
        variantConfig: VariantConfig,
        regionConfig: RegionConfig,
    ): Record<string, string>;
}
