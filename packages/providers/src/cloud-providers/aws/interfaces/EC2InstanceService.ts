import { Region, VariantConfig } from "@tf2qs/core";

export interface EC2InstanceService {
    /**
     * Creates a dedicated EC2 instance for the game server
     */
    create(args: {
        serverId: string;
        region: Region;
        variantConfig: VariantConfig;
        securityGroupId: string;
    }): Promise<string>;

    /**
     * Terminates the dedicated EC2 instance for the game server
     */
    terminate(serverId: string, region: Region): Promise<void>;
}
