import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { Region } from '../../../../core/domain';
import { NetworkService as NetworkServiceInterface } from '../interfaces';
import { AWSResourceManagerBase } from '../base/AWSResourceManagerBase';

/**
 * Service responsible for network-related operations for TF2 servers
 */
export class DefaultNetworkService extends AWSResourceManagerBase implements NetworkServiceInterface {
    
    async getPublicIp(instanceId: string, region: Region): Promise<string> {
        return this.executeWithTracing(
            'NetworkService.getPublicIp',
            instanceId,
            async () => {
                const { ec2Client } = this.getAWSClients(region);

                this.logOperationStart('Retrieving public IP', instanceId, region);

                const describeInstanceResponse = await ec2Client.send(new DescribeInstancesCommand({
                    InstanceIds: [instanceId]
                }));

                const instance = describeInstanceResponse.Reservations?.[0]?.Instances?.[0];
                if (!instance) {
                    throw new Error("EC2 instance not found");
                }

                const publicIp = instance.PublicIpAddress;
                if (!publicIp) {
                    throw new Error("Failed to retrieve public IP from EC2 instance. Instance may not be in a public subnet or may not have a public IP assigned.");
                }

                this.logOperationSuccess('Public IP retrieved', instanceId, region, { publicIp });
                return publicIp;
            }
        );
    }
}
