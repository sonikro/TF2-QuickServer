import { Region } from '@tf2qs/core/src/domain';
import { ConfigManager } from '@tf2qs/core/src/utils/ConfigManager';
import { AWSClients } from '../../../services/defaultAWSServiceFactory';

/**
 * Service for AWS-specific configuration and client management
 */
export class AWSConfigService {
    constructor(
        private readonly configManager: ConfigManager,
        private readonly awsClientFactory: (rootRegion: string) => AWSClients
    ) {}

    /**
     * Gets the ConfigManager instance
     */
    getConfigManager(): ConfigManager {
        return this.configManager;
    }

    /**
     * Gets AWS configuration for a region
     */
    getRegionConfig(region: Region) {
        const awsConfig = this.configManager.getAWSConfig();
        const awsRegionConfig = awsConfig.regions[region];

        if (!awsRegionConfig) {
            throw new Error(`Region ${region} is not configured in AWS config`);
        }

        return awsRegionConfig;
    }

    /**
     * Gets AWS clients for a region
     */
    getClients(region: Region): AWSClients {
        const awsRegionConfig = this.getRegionConfig(region);
        return this.awsClientFactory(awsRegionConfig.rootRegion);
    }
}
