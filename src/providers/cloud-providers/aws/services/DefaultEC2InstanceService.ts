import {
    _InstanceType,
    DescribeImagesCommand,
    DescribeInstancesCommand,
    RunInstancesCommand,
    TerminateInstancesCommand,
    waitUntilInstanceRunning
} from "@aws-sdk/client-ec2";
import { Region, VariantConfig } from '../../../../core/domain';
import { InsufficientCapacityError } from '../../../../core/errors/InsufficientCapacityError';
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { logger } from '../../../../telemetry/otel';
import { EC2InstanceService as EC2InstanceServiceInterface } from '../interfaces';
import { AWSConfigService } from "./AWSConfigService";

/**
 * Service responsible for managing dedicated EC2 instances for TF2 servers.
 * 
 * This service handles EC2 instance lifecycle operations including creation and termination.
 * 
 * ## Capacity Error Handling
 * 
 * AWS Local Zones (like Buenos Aires) can experience insufficient capacity errors.
 * To mitigate this, the service implements an automatic fallback mechanism:
 * 
 * 1. Primary attempt: t3.medium instance type
 * 2. First fallback: t3a.medium (AMD-based alternative, often has separate capacity pools)
 * 3. Second fallback: t3.small (smaller instance, usually more available)
 * 
 * When all instance types are exhausted, an InsufficientCapacityError is thrown,
 * which is caught by the command handler and presented to users with a friendly message.
 * 
 * ## Logging and Monitoring
 * 
 * All capacity errors and fallback attempts are logged to OpenTelemetry for monitoring.
 * This helps track capacity issues across regions and instance types.
 * 
 * @see InsufficientCapacityError for the custom error type
 * @see getFallbackInstanceTypes for the fallback strategy
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

    /**
     * Get fallback instance types to try when the primary instance type fails
     * with InsufficientInstanceCapacity error
     */
    private getFallbackInstanceTypes(primaryType: _InstanceType): _InstanceType[] {
        // For t3.medium, try t3a.medium (AMD alternative) and t3.small as fallbacks
        if (primaryType === _InstanceType.t3_medium) {
            return [_InstanceType.t3a_medium, _InstanceType.t3_small];
        }
        return [];
    }

    /**
     * Check if an error is an InsufficientInstanceCapacity error from AWS
     */
    private isInsufficientCapacityError(error: any): boolean {
        return error?.name === 'InsufficientInstanceCapacity' || 
               error?.Code === 'InsufficientInstanceCapacity' ||
               error?.__type === 'InsufficientInstanceCapacity' ||
               (error?.message && error.message.includes('InsufficientInstanceCapacity'));
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

    /**
     * Attempt to launch an EC2 instance with the specified parameters
     */
    private async launchInstance(args: {
        ec2Client: any;
        amiId: string;
        instanceType: _InstanceType;
        securityGroupId: string;
        awsRegionConfig: any;
        userData: string;
        serverId: string;
    }): Promise<string> {
        const runInstanceResponse = await args.ec2Client.send(new RunInstancesCommand({
            ImageId: args.amiId,
            InstanceType: args.instanceType,
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds: [args.securityGroupId],
            SubnetId: args.awsRegionConfig.subnet_id,
            UserData: args.userData,
            IamInstanceProfile: {
                Arn: args.awsRegionConfig.instance_profile_arn,
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

        return instanceId;
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
                const primaryInstanceType = this.getInstanceTypeForVariant(args.variantConfig.ocpu, args.variantConfig.memory);
                const fallbackInstanceTypes = this.getFallbackInstanceTypes(primaryInstanceType);
                const instanceTypesToTry = [primaryInstanceType, ...fallbackInstanceTypes];
                
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

                let lastError: any = null;
                
                // Try each instance type in order
                for (const instanceType of instanceTypesToTry) {
                    try {
                        logger.emit({
                            severityText: 'INFO',
                            body: `Attempting to launch EC2 instance with type ${instanceType}`,
                            attributes: {
                                serverId: args.serverId,
                                region: args.region,
                                instanceType
                            }
                        });

                        const instanceId = await this.launchInstance({
                            ec2Client,
                            amiId,
                            instanceType,
                            securityGroupId: args.securityGroupId,
                            awsRegionConfig,
                            userData,
                            serverId: args.serverId
                        });

                        this.tracingService.logOperationSuccess('EC2 instance launched', args.serverId, args.region, {
                            instanceId,
                            instanceType
                        });

                        // Wait for instance to be running
                        await waitUntilInstanceRunning(
                            { client: ec2Client, maxWaitTime: 300 },
                            { InstanceIds: [instanceId] }
                        );

                        this.tracingService.logOperationSuccess('EC2 instance is running', args.serverId, args.region, {
                            instanceId,
                            instanceType
                        });

                        return instanceId;

                    } catch (error: any) {
                        lastError = error;
                        
                        if (this.isInsufficientCapacityError(error)) {
                            logger.emit({
                                severityText: 'WARN',
                                body: `InsufficientInstanceCapacity error for ${instanceType}, trying next option`,
                                attributes: {
                                    serverId: args.serverId,
                                    region: args.region,
                                    instanceType,
                                    error: error.message
                                }
                            });
                            // Continue to next instance type
                            continue;
                        } else {
                            // For other errors, throw immediately
                            throw error;
                        }
                    }
                }

                // If we get here, all instance types failed with capacity errors
                logger.emit({
                    severityText: 'ERROR',
                    body: 'All instance types exhausted due to insufficient capacity',
                    attributes: {
                        serverId: args.serverId,
                        region: args.region,
                        attemptedTypes: instanceTypesToTry.join(', ')
                    }
                });

                throw new InsufficientCapacityError(
                    `Unable to launch EC2 instance in ${args.region}. AWS does not have sufficient capacity for any of the attempted instance types (${instanceTypesToTry.join(', ')}). Please try again later.`,
                    args.region,
                    primaryInstanceType
                );
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
