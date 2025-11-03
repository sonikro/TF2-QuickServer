import {
    _InstanceType,
    DescribeImagesCommand,
    DescribeInstancesCommand,
    EC2ServiceException,
    RunInstancesCommand,
    TerminateInstancesCommand,
    waitUntilInstanceRunning
} from "@aws-sdk/client-ec2";
import { Region, VariantConfig } from '../../../../core/domain';
import { InsufficientCapacityError } from '../../../../core/errors/InsufficientCapacityError';
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { EC2InstanceService as EC2InstanceServiceInterface } from '../interfaces';
import { AWSConfigService } from "./AWSConfigService";

/**
 * Service responsible for managing dedicated EC2 instances for TF2 servers
 */
export class DefaultEC2InstanceService implements EC2InstanceServiceInterface {
    constructor(
        private readonly awsConfigService: AWSConfigService,
        private readonly tracingService: OperationTracingService
    ) { }

    private getInstanceTypeForVariant(ocpu: number, memory: number): _InstanceType {
        // Currently only supporting t3_medum;
        if (ocpu === 1 && memory === 4) {
            return _InstanceType.t3_medium;
        }
        throw new Error(`Currently only supporting t3_medium instances`);
    }

    private async getLatestECSOptimizedAMI(region: Region): Promise<string> {
        const { ec2Client: rootEc2Client } = this.awsConfigService.getClients(region);

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
        return this.tracingService.executeWithTracing(
            'GameServerInstanceService.create',
            args.serverId,
            async () => {
                const { ec2Client } = this.awsConfigService.getClients(args.region);
                const awsRegionConfig = this.awsConfigService.getRegionConfig(args.region);

                this.tracingService.logOperationStart('Launching EC2 instance', args.serverId, args.region);

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

                try {
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

                    this.tracingService.logOperationSuccess('EC2 instance launched', args.serverId, args.region, {
                        instanceId
                    });

                    // Wait for instance to be running
                    await waitUntilInstanceRunning(
                        { client: ec2Client, maxWaitTime: 300 },
                        { InstanceIds: [instanceId] }
                    );

                    this.tracingService.logOperationSuccess('EC2 instance is running', args.serverId, args.region, {
                        instanceId
                    });

                    return instanceId;
                } catch (error) {
                    if (error instanceof EC2ServiceException && error.name === 'InsufficientInstanceCapacity') {
                        throw new InsufficientCapacityError();
                    }
                    throw error;
                }
            }
        );
    }

    async terminate(serverId: string, region: Region): Promise<void> {
        return this.tracingService.executeWithTracing(
            'GameServerInstanceService.terminate',
            serverId,
            async () => {
                const { ec2Client } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Finding instance to terminate', serverId, region);

                // First, find the instance by server ID
                const describeResponse = await ec2Client.send(new DescribeInstancesCommand({
                    Filters: [
                        {
                            Name: "tag:Server",
                            Values: [serverId],
                        },
                        {
                            Name: "instance-state-name",
                            Values: ["running", "pending", "stopped"],
                        },
                    ],
                }));

                const instances = describeResponse.Reservations?.flatMap(r => r.Instances || []) || [];
                const instanceIds = instances
                    .map(i => i.InstanceId)
                    .filter((id): id is string => id !== undefined);

                if (instanceIds.length === 0) {
                    this.tracingService.logOperationSuccess('No instances found to terminate (already terminated)', serverId, region);
                    return;
                }

                this.tracingService.logOperationStart('Terminating instances', serverId, region, {
                    instanceIds
                });

                await ec2Client.send(new TerminateInstancesCommand({
                    InstanceIds: instanceIds,
                }));

                this.tracingService.logOperationSuccess('Instances terminated', serverId, region, {
                    instanceIds
                });
            }
        );
    }
}
