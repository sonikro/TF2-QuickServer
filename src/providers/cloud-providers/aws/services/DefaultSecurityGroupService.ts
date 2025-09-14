import {
    AuthorizeSecurityGroupIngressCommand,
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand,
} from "@aws-sdk/client-ec2";
import { Region } from '../../../../core/domain';
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { SecurityGroupService as SecurityGroupServiceInterface } from '../interfaces';
import { AWSConfigService } from "./AWSConfigService";

/**
 * Service responsible for managing AWS Security Groups for TF2 servers
 */
export class DefaultSecurityGroupService implements SecurityGroupServiceInterface {

    constructor(
        private readonly awsConfigService: AWSConfigService,
        private readonly tracingService: OperationTracingService
    ) { }

    async create(serverId: string, region: Region): Promise<string> {
        return this.tracingService.executeWithTracing(
            'SecurityGroupService.create',
            serverId,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(region);
                const { ec2Client } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Creating security group', serverId, region);

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

                this.tracingService.logOperationSuccess('Security group created', serverId, region, { securityGroupId });
                return securityGroupId;
            }
        );
    }

    async delete(serverId: string, region: Region): Promise<void> {
        return this.tracingService.executeWithTracing(
            'SecurityGroupService.delete',
            serverId,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(region);
                const { ec2Client } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Deleting security group', serverId, region);

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
                    this.tracingService.logOperationSuccess('Security group not found (already deleted)', serverId, region);
                    return;
                }

                // Delete the security group
                await ec2Client.send(new DeleteSecurityGroupCommand({
                    GroupId: securityGroup.GroupId!,
                }));

                this.tracingService.logOperationSuccess('Security group deleted', serverId, region, {
                    securityGroupId: securityGroup.GroupId
                });
            }
        );
    }
}
