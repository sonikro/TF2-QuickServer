import {
    RunInstancesCommand,
    TerminateInstancesCommand,
    DescribeInstancesCommand,
    DescribeImagesCommand,
    waitUntilInstanceRunning,
    _InstanceType
} from "@aws-sdk/client-ec2";
import { Region, VariantConfig } from '../../../../core/domain';
import { EC2InstanceService as EC2InstanceServiceInterface } from '../interfaces';
import { AWSResourceManagerBase } from '../base/AWSResourceManagerBase';

/**
 * Service responsible for managing dedicated EC2 instances for TF2 servers
 */
export class DefaultEC2InstanceService extends AWSResourceManagerBase implements EC2InstanceServiceInterface {
    
    private getInstanceTypeForVariant(ocpu: number, memory: number): _InstanceType {
        // Basic mapping - can be enhanced based on requirements
        if (ocpu >= 4 && memory >= 8) {
            return _InstanceType.t3_xlarge;
        }
        return _InstanceType.t3_medium;
    }

    private async getLatestECSOptimizedAMI(region: Region): Promise<string> {
        const { ec2Client: rootEc2Client } = this.getAWSClients(region);

        const imageResponse = await rootEc2Client.send(new DescribeImagesCommand({
            Owners: ['amazon'],
            Filters: [
                {
                    Name: 'name',
                    Values: ['amzn2-ami-ecs-hvm-2.0.*-x86_64-ebs']
                },
                {
                    Name: 'architecture',
                    Values: ['x86_64']
                },
                {
                    Name: 'state',
                    Values: ['available']
                },
                {
                    Name: 'virtualization-type',
                    Values: ['hvm']
                }
            ]
        }));

        if (!imageResponse.Images || imageResponse.Images.length === 0) {
            throw new Error('No ECS-optimized AMI found');
        }

        // Sort by creation date and get the latest
        const latestImage = imageResponse.Images
            .sort((a, b) => new Date(b.CreationDate!).getTime() - new Date(a.CreationDate!).getTime())[0];

        return latestImage.ImageId!;
    }

    async create(args: {
        serverId: string;
        region: Region;
        variantConfig: VariantConfig;
        securityGroupId: string;
    }): Promise<string> {
        return this.executeWithTracing(
            'GameServerInstanceService.create',
            args.serverId,
            async () => {
                const { ec2Client } = this.getAWSClients(args.region);
                const awsRegionConfig = this.getAWSRegionConfig(args.region);

                this.logOperationStart('Launching EC2 instance', args.serverId, args.region);

                // Get the appropriate instance type and AMI
                const instanceType = this.getInstanceTypeForVariant(args.variantConfig.ocpu, args.variantConfig.memory);
                const amiId = await this.getLatestECSOptimizedAMI(args.region);

                // User data script to register with ECS cluster
                const userData = Buffer.from(`#!/bin/bash
# Log all output for debugging
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting ECS agent configuration..."
echo "Cluster name: ${awsRegionConfig.cluster_name}"
echo "Server ID: ${args.serverId}"
echo "Region: ${awsRegionConfig.rootRegion}"

# Configure ECS agent
cat <<'EOF' >> /etc/ecs/ecs.config
ECS_CLUSTER=${awsRegionConfig.cluster_name}
ECS_INSTANCE_ATTRIBUTES={"server-id":"${args.serverId}"}
ECS_ENABLE_CONTAINER_METADATA=true
ECS_AVAILABLE_LOGGING_DRIVERS=["json-file","awslogs"]
ECS_LOGLEVEL=info
ECS_ENABLE_TASK_IAM_ROLE=true
EOF

echo "ECS configuration completed"
`).toString('base64');

                const runInstanceResponse = await ec2Client.send(new RunInstancesCommand({
                    ImageId: amiId,
                    InstanceType: instanceType,
                    MinCount: 1,
                    MaxCount: 1,
                    SecurityGroupIds: [args.securityGroupId],
                    SubnetId: awsRegionConfig.subnet_id,
                    UserData: userData,
                    IamInstanceProfile: {
                        Arn: awsRegionConfig.instance_profile_arn,
                    },
                    TagSpecifications: [
                        {
                            ResourceType: "instance",
                            Tags: [
                                {
                                    Key: "Name",
                                    Value: args.serverId,
                                },
                                {
                                    Key: "Server",
                                    Value: args.serverId,
                                },
                            ],
                        },
                    ],
                }));

                const instanceId = runInstanceResponse.Instances?.[0]?.InstanceId;
                if (!instanceId) {
                    throw new Error("Failed to launch EC2 instance");
                }

                this.logOperationSuccess('EC2 instance launched', args.serverId, args.region, { 
                    instanceId 
                });

                // Wait for instance to be running
                await waitUntilInstanceRunning(
                    { client: ec2Client, maxWaitTime: 300 },
                    { InstanceIds: [instanceId] }
                );

                this.logOperationSuccess('EC2 instance is running', args.serverId, args.region, { 
                    instanceId 
                });

                return instanceId;
            }
        );
    }

    async terminate(serverId: string, region: Region): Promise<void> {
        return this.executeWithTracing(
            'GameServerInstanceService.terminate',
            serverId,
            async () => {
                const { ec2Client } = this.getAWSClients(region);

                this.logOperationStart('Finding instance to terminate', serverId, region);

                // First, find the instance by server ID
                const describeResponse = await ec2Client.send(new DescribeInstancesCommand({
                    Filters: [
                        {
                            Name: "tag:Server",
                            Values: [serverId],
                        },
                        {
                            Name: "instance-state-name",
                            Values: ["running", "pending"],
                        },
                    ],
                }));

                const instances = describeResponse.Reservations?.flatMap(r => r.Instances || []) || [];
                const instanceIds = instances
                    .map(i => i.InstanceId)
                    .filter((id): id is string => id !== undefined);

                if (instanceIds.length === 0) {
                    this.logOperationSuccess('No running instances found to terminate', serverId, region);
                    return;
                }

                this.logOperationStart('Terminating instances', serverId, region, { 
                    instanceIds 
                });

                await ec2Client.send(new TerminateInstancesCommand({
                    InstanceIds: instanceIds,
                }));

                this.logOperationSuccess('Instances terminated', serverId, region, { 
                    instanceIds 
                });
            }
        );
    }
}
