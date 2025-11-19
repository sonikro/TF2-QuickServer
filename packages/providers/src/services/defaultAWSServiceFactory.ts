import { EC2Client } from "@aws-sdk/client-ec2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";

export interface AWSClients {
    ecsClient: ECSClient;
    ec2Client: EC2Client;
    ceClient: CostExplorerClient;
}

export type AWSClientFactory = (rootRegion: string) => AWSClients;

/**
 * Factory function to create AWS clients for a given region.
 * @param rootRegion - The root AWS region for SDK connections.
 * @returns AWS client instances configured for the specified region.
 */
export function defaultAWSServiceFactory(rootRegion: string): AWSClients {
    return {
        ecsClient: new ECSClient({
            region: rootRegion,
        }),
        ec2Client: new EC2Client({
            region: rootRegion,
        }),
        ceClient: new CostExplorerClient({
            region: rootRegion,
        }),
    };
}
