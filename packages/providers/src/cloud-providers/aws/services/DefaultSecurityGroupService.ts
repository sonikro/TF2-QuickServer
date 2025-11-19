import {
    AuthorizeSecurityGroupIngressCommand,
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand,
    EC2Client,
} from "@aws-sdk/client-ec2";
import { Region } from '@tf2qs/core/src/domain';
import { OperationTracingService } from "@tf2qs/telemetry/src/OperationTracingService";
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

                // Delete the security group with retry logic for dependency errors
                await this.deleteSecurityGroupWithRetry(ec2Client, securityGroup.GroupId!, serverId, region);

                this.tracingService.logOperationSuccess('Security group deleted', serverId, region, {
                    securityGroupId: securityGroup.GroupId
                });
            }
        );
    }

    private async deleteSecurityGroupWithRetry(
        ec2Client: EC2Client,
        securityGroupId: string,
        serverId: string,
        region: Region,
        maxRetries: number = 30,
        delayMs: number = 5000
    ): Promise<void> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await ec2Client.send(new DeleteSecurityGroupCommand({
                    GroupId: securityGroupId,
                }));

                return;
            } catch (error: any) {
                lastError = error;

                if (this.isGroupNotFoundError(error)) {
                    this.tracingService.logOperationSuccess(
                        'Security group not found during deletion (already deleted)',
                        serverId,
                        region,
                        { securityGroupId }
                    );
                    return;
                }

                const isDependencyError =
                    error.name === 'DependencyViolation' ||
                    error.Code === 'DependencyViolation' ||
                    (error.message && error.message.includes('DependencyViolation')) ||
                    (error.message && error.message.includes('has a dependent object'));

                if (isDependencyError) {
                    this.tracingService.logOperationStart(
                        `Security group deletion failed due to dependency (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`,
                        serverId,
                        region,
                        { securityGroupId, errorMessage: error.message }
                    );

                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                } else {
                    throw error;
                }
            }
        }

        throw new Error(
            `Failed to delete security group ${securityGroupId} after ${maxRetries} attempts. Last error: ${lastError?.message}`
        );
    }

    private isGroupNotFoundError(error: any): boolean {
        const errorName = error.name || '';
        const errorCode = error.Code || '';
        const errorMessage = error.message || '';

        return (
            errorCode === 'InvalidGroup.NotFound' ||
            errorName === 'InvalidGroup.NotFound' ||
            errorMessage.includes('InvalidGroup.NotFound') ||
            errorMessage.includes('does not exist')
        );
    }
}
