import {
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand,
    AuthorizeSecurityGroupIngressCommand,
} from "@aws-sdk/client-ec2";
import { Region } from '../../../../core/domain';
import { SecurityGroupService as SecurityGroupServiceInterface } from '../interfaces';
import { AWSResourceManagerBase } from '../base/AWSResourceManagerBase';

/**
 * Service responsible for managing AWS Security Groups for TF2 servers
 */
export class DefaultSecurityGroupService extends AWSResourceManagerBase implements SecurityGroupServiceInterface {
    
    async create(serverId: string, region: Region): Promise<string> {
        return this.executeWithTracing(
            'SecurityGroupService.create',
            serverId,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(region);
                const { ec2Client } = this.getAWSClients(region);

                this.logOperationStart('Creating security group', serverId, region);

                // Create security group
                const createSgResponse = await ec2Client.send(new CreateSecurityGroupCommand({
                    GroupName: serverId,
                    Description: `Security group for TF2 server ${serverId}`,
                    VpcId: awsRegionConfig.vpc_id,
                }));

                const securityGroupId = createSgResponse.GroupId!;

                // Add ingress rules for TF2 server ports
                await ec2Client.send(new AuthorizeSecurityGroupIngressCommand({
                    GroupId: securityGroupId,
                    IpPermissions: [
                        {
                            IpProtocol: 'tcp',
                            FromPort: 27015,
                            ToPort: 27020,
                            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                        },
                        {
                            IpProtocol: 'udp',
                            FromPort: 27015,
                            ToPort: 27020,
                            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                        },
                    ],
                }));

                this.logOperationSuccess('Security group created', serverId, region, { securityGroupId });
                return securityGroupId;
            }
        );
    }

    async delete(serverId: string, region: Region): Promise<void> {
        return this.executeWithTracing(
            'SecurityGroupService.delete',
            serverId,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(region);
                const { ec2Client } = this.getAWSClients(region);

                this.logOperationStart('Deleting security group', serverId, region);

                // Find the security group by name (serverId)
                const describeResponse = await ec2Client.send(new DescribeSecurityGroupsCommand({
                    Filters: [
                        {
                            Name: 'group-name',
                            Values: [serverId]
                        },
                        {
                            Name: 'vpc-id',
                            Values: [awsRegionConfig.vpc_id]
                        }
                    ]
                }));

                const securityGroup = describeResponse.SecurityGroups?.[0];
                if (!securityGroup) {
                    this.logOperationSuccess('Security group not found (already deleted)', serverId, region);
                    return;
                }

                // Delete the security group
                await ec2Client.send(new DeleteSecurityGroupCommand({
                    GroupId: securityGroup.GroupId!,
                }));

                this.logOperationSuccess('Security group deleted', serverId, region, { 
                    securityGroupId: securityGroup.GroupId 
                });
            }
        );
    }
}
