import { ServerCredentials } from '@tf2qs/core';
import { DeploymentContext } from '@tf2qs/core';
import { EnvironmentBuilderService } from '@tf2qs/core';
import { VariantConfig, RegionConfig, getRegionDisplayName } from '@tf2qs/core';
import { Chance } from "chance";

const chance = new Chance();

/**
 * Default implementation of EnvironmentBuilderService
 */
export class DefaultEnvironmentBuilderService implements EnvironmentBuilderService {
    
    build(
        context: DeploymentContext,
        credentials: ServerCredentials,
        variantConfig: VariantConfig,
        regionConfig: RegionConfig,
    ): Record<string, string> {
        const defaultCfgsEnvironment = variantConfig.defaultCfgs
            ? Object.entries(variantConfig.defaultCfgs).map(([key, value]) => ({
                [`DEFAULT_${key.toUpperCase()}_CFG`]: value,
            }))
            : [];

        // the admins array is immutable, so we need to create a new array
        const adminList = variantConfig.admins ? [...variantConfig.admins, context.sourcemodAdminSteamId] : [context.sourcemodAdminSteamId];

        // Extract first UUID block (before first hyphen) for hostname prefix
        const uuidPrefix = context.uuidPrefix;

        const hostname = variantConfig.hostname ? variantConfig.hostname.replace("{region}", getRegionDisplayName(context.region)) : regionConfig.srcdsHostname;
        const finalHostname = `#${uuidPrefix} ${hostname}`;

        const environment: Record<string, string> = {
            SERVER_HOSTNAME: finalHostname,
            SERVER_PASSWORD: credentials.serverPassword,
            DEMOS_TF_APIKEY: process.env.DEMOS_TF_APIKEY || "",
            LOGS_TF_APIKEY: process.env.LOGS_TF_APIKEY || "",
            RCON_PASSWORD: credentials.rconPassword,
            STV_NAME: regionConfig.tvHostname,
            STV_PASSWORD: credentials.tvPassword,
            ADMIN_LIST: adminList.filter(Boolean).join(","), // Filter out undefined/null values
            SV_LOGSECRET: credentials.logSecret.toString(),
            ...Object.assign({}, ...defaultCfgsEnvironment),
            ...context.extraEnvs,
        };

        return environment;
    }
}
