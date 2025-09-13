import {
    CreateServiceCommand,
    DeleteServiceCommand,
    DeregisterTaskDefinitionCommand,
    DescribeServicesCommand,
    DescribeTasksCommand,
    ListTasksCommand,
    RegisterTaskDefinitionCommand,
    waitUntilServicesStable,
    DescribeContainerInstancesCommand,
    ListContainerInstancesCommand
} from "@aws-sdk/client-ecs";
import {
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand,
    AuthorizeSecurityGroupIngressCommand,
    DescribeNetworkInterfacesCommand,
    RunInstancesCommand,
    TerminateInstancesCommand,
    DescribeInstancesCommand,
    DescribeImagesCommand,
    _InstanceType,
    waitUntilInstanceRunning
} from "@aws-sdk/client-ec2";
import { logger, tracer, meter } from '../../telemetry/otel';
import { Span } from '@opentelemetry/api';
import { getRegionDisplayName, Region, Server, Variant } from "../../core/domain";
import { ServerStatus } from "../../core/domain/ServerStatus";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";
import { waitUntil } from "../utils/waitUntil";
import { StatusUpdater } from "../../core/services/StatusUpdater";
import { AWSClients } from "./defaultAWSServiceFactory";
import { Chance } from "chance";

const chance = new Chance();

const serverCreationDurationHistogram = meter.createHistogram('server_creation_duration_seconds', {
    description: 'Duration to create a server (seconds)',
});

export class ECSServerManager implements ServerManager {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGenerator: PasswordGenerator;
            awsClientFactory: (rootRegion: string) => AWSClients;
            serverAbortManager: ServerAbortManager;
        }
    ) { }

    async deployServer(args: {
        serverId: string;
        region: Region;
        variantName: Variant;
        statusUpdater: StatusUpdater;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }): Promise<Server> {
        return await tracer.startActiveSpan('ECSServerManager.deployServer', async (parentSpan: Span) => {
            parentSpan.setAttribute('serverId', args.serverId);
            const startTime = Date.now();
            const { serverCommander, configManager, passwordGenerator, awsClientFactory, serverAbortManager } = this.dependencies;
            const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {}, statusUpdater } = args;
            const abortController = serverAbortManager.getOrCreate(serverId);

            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];

                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ecsClient, ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);
                const variantConfig = configManager.getVariantConfig(variantName);
                const regionConfig = configManager.getRegionConfig(region);

                const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false };
                const serverPassword = passwordGenerator(passwordSettings);
                const rconPassword = passwordGenerator(passwordSettings);
                const tvPassword = passwordGenerator(passwordSettings);

                const containerImage = variantConfig.image;
                const logSecret = chance.integer({ min: 1, max: 999999 });

                const defaultCfgsEnvironment = variantConfig.defaultCfgs
                    ? Object.entries(variantConfig.defaultCfgs).map(([key, value]) => ({
                        [`DEFAULT_${key.toUpperCase()}_CFG`]: value,
                    }))
                    : [];

                // the admins array is immutable, so we need to create a new array
                const adminList = variantConfig.admins ? [...variantConfig.admins, sourcemodAdminSteamId] : [sourcemodAdminSteamId];

                // Extract first UUID block (before first hyphen) for hostname prefix
                const uuidPrefix = serverId.split('-')[0];

                const hostname = variantConfig.hostname ? variantConfig.hostname.replace("{region}", getRegionDisplayName(region)) : regionConfig.srcdsHostname;
                const finalHostname = `#${uuidPrefix} ${hostname}`;

                const environmentVariables: Record<string, string> = {
                    SERVER_HOSTNAME: finalHostname,
                    SERVER_PASSWORD: serverPassword,
                    DEMOS_TF_APIKEY: process.env.DEMOS_TF_APIKEY || "",
                    LOGS_TF_APIKEY: process.env.LOGS_TF_APIKEY || "",
                    RCON_PASSWORD: rconPassword,
                    STV_NAME: regionConfig.tvHostname,
                    STV_PASSWORD: tvPassword,
                    ADMIN_LIST: adminList.join(","),
                    SV_LOGSECRET: logSecret.toString(),
                    ...Object.assign({}, ...defaultCfgsEnvironment),
                    ...extraEnvs,
                };

                // Convert environment to ECS format
                const environmentArray = Object.entries(environmentVariables).map(([name, value]: [string, string | number]) => ({ name, value: typeof value === "number" ? value.toString() : value }));

                // Notify user: Creating task definition
                let taskDefinitionArn: string;
                await tracer.startActiveSpan('Register Task Definition', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`📋 [1/8] Creating task definition...`);
                    logger.emit({ severityText: 'INFO', body: `Registering task definition for server ID: ${serverId}`, attributes: { serverId } });

                    const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
                        family: serverId,
                        networkMode: "host",
                        requiresCompatibilities: ["EC2"],
                        // Remove CPU and memory constraints - these are handled by the EC2 instance
                        executionRoleArn: awsRegionConfig.task_execution_role_arn,
                        taskRoleArn: awsRegionConfig.task_role_arn,
                        // TODO: Add Shield and NewRelic Containers
                        containerDefinitions: [
                            {
                                name: "tf2-server",
                                image: containerImage,
                                essential: true,
                                cpu: 1536,
                                memory: 3584, // Reserve 3.5GB for the game server (leaving 0.5GB for system)
                                environment: environmentArray,
                                command: [
                                    "-enablefakeip",
                                    "+sv_pure",
                                    variantConfig.svPure.toString(),
                                    "+maxplayers",
                                    variantConfig.maxPlayers.toString(),
                                    "+map",
                                    variantConfig.map,
                                ],
                                portMappings: [
                                    {
                                        containerPort: 27015,
                                        hostPort: 27015,
                                        protocol: "tcp"
                                    },
                                    {
                                        containerPort: 27015,
                                        hostPort: 27015,
                                        protocol: "udp"
                                    },
                                    {
                                        containerPort: 27020,
                                        hostPort: 27020,
                                        protocol: "tcp"
                                    },
                                    {
                                        containerPort: 27020,
                                        hostPort: 27020,
                                        protocol: "udp"
                                    }
                                ],
                                logConfiguration: {
                                    logDriver: "awslogs",
                                    options: {
                                        "awslogs-group": awsRegionConfig.log_group_name,
                                        "awslogs-region": awsRegionConfig.rootRegion,
                                        "awslogs-stream-prefix": `tf2-server-${serverId}`
                                    }
                                }
                            },
                        ],
                    }));

                    taskDefinitionArn = taskDefinitionResponse.taskDefinition?.taskDefinitionArn!;
                    if (!taskDefinitionArn) {
                        throw new Error("Failed to register task definition");
                    }
                    span.end();
                });

                // Create security group for the server
                let securityGroupId: string;
                await tracer.startActiveSpan('Create Security Group', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🔒 [2/8] Creating security group...`);
                    securityGroupId = await this.createSecurityGroup({ serverId, region });
                    span.end();
                });

                // Create dedicated EC2 instance for the game server
                let instanceId: string;
                await tracer.startActiveSpan('Create EC2 Instance', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🖥️ [3/8] Creating dedicated EC2 instance...`);
                    instanceId = await this.createGameServerInstance({ 
                        serverId, 
                        region, 
                        variantConfig, 
                        securityGroupId 
                    });
                    span.end();
                });

                // Wait for instance to be running and registered with ECS
                await tracer.startActiveSpan('Wait for Instance Ready', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`⏳ [4/8] Waiting for instance to be ready...`);
                    
                    // First, wait for EC2 instance to be running
                    logger.emit({ 
                        severityText: 'INFO', 
                        body: `Waiting for EC2 instance ${instanceId} to be running`, 
                        attributes: { serverId, instanceId } 
                    });
                    
                    const { ec2Client, ecsClient } = awsClientFactory(awsRegionConfig.rootRegion);
                    
                    await waitUntilInstanceRunning({
                        client: ec2Client,
                        maxWaitTime: 300, // 5 minutes
                        maxDelay: 15,
                        minDelay: 5
                    }, {
                        InstanceIds: [instanceId]
                    });
                    
                    logger.emit({ 
                        severityText: 'INFO', 
                        body: `EC2 instance ${instanceId} is now running, waiting for ECS registration`, 
                        attributes: { serverId, instanceId } 
                    });
                    
                    // Then wait for the instance to register with ECS cluster
                    let isRegistered = false;
                    const maxRetries = 40; // 10 minutes with 15 second intervals
                    let retries = 0;
                    
                    while (!isRegistered && retries < maxRetries) {
                        try {
                            logger.emit({ 
                                severityText: 'INFO', 
                                body: `Checking ECS registration attempt ${retries + 1}/${maxRetries} for instance ${instanceId}`, 
                                attributes: { serverId, instanceId, retry: retries + 1, maxRetries } 
                            });

                            const containerInstancesResponse = await ecsClient.send(new ListContainerInstancesCommand({
                                cluster: awsRegionConfig.cluster_name
                            }));
                            
                            logger.emit({ 
                                severityText: 'INFO', 
                                body: `Found ${containerInstancesResponse.containerInstanceArns?.length || 0} container instances in cluster`, 
                                attributes: { serverId, instanceId, containerInstanceCount: containerInstancesResponse.containerInstanceArns?.length || 0 } 
                            });
                            
                            if (containerInstancesResponse.containerInstanceArns && containerInstancesResponse.containerInstanceArns.length > 0) {
                                const containerInstanceDetails = await ecsClient.send(new DescribeContainerInstancesCommand({
                                    cluster: awsRegionConfig.cluster_name,
                                    containerInstances: containerInstancesResponse.containerInstanceArns
                                }));
                                
                                // Log all container instances for debugging
                                containerInstanceDetails.containerInstances?.forEach(ci => {
                                    logger.emit({ 
                                        severityText: 'INFO', 
                                        body: `Container instance: ${ci.ec2InstanceId}, status: ${ci.status}, attributes: ${JSON.stringify(ci.attributes)}`, 
                                        attributes: { serverId, instanceId, containerInstanceId: ci.ec2InstanceId, status: ci.status } 
                                    });
                                });
                                
                                // Check if our instance is registered and has the correct server-id attribute
                                const ourInstance = containerInstanceDetails.containerInstances?.find(ci => 
                                    ci.ec2InstanceId === instanceId && 
                                    ci.attributes?.some(attr => attr.name === 'server-id' && attr.value === serverId)
                                );
                                
                                if (ourInstance && ourInstance.status === 'ACTIVE') {
                                    isRegistered = true;
                                    logger.emit({ 
                                        severityText: 'INFO', 
                                        body: `Instance ${instanceId} successfully registered with ECS cluster`, 
                                        attributes: { serverId, instanceId, containerInstanceArn: ourInstance.containerInstanceArn } 
                                    });
                                } else if (ourInstance) {
                                    logger.emit({ 
                                        severityText: 'INFO', 
                                        body: `Instance ${instanceId} found in cluster but status is ${ourInstance.status}, waiting...`, 
                                        attributes: { serverId, instanceId, status: ourInstance.status } 
                                    });
                                } else {
                                    // Check if the EC2 instance is registered but without our server-id attribute
                                    const instanceInCluster = containerInstanceDetails.containerInstances?.find(ci => 
                                        ci.ec2InstanceId === instanceId
                                    );
                                    
                                    if (instanceInCluster) {
                                        logger.emit({ 
                                            severityText: 'WARNING', 
                                            body: `Instance ${instanceId} is in cluster but missing server-id attribute: ${JSON.stringify(instanceInCluster.attributes)}`, 
                                            attributes: { serverId, instanceId, attributes: JSON.stringify(instanceInCluster.attributes) } 
                                        });
                                    } else {
                                        logger.emit({ 
                                            severityText: 'INFO', 
                                            body: `Instance ${instanceId} not yet registered in ECS cluster`, 
                                            attributes: { serverId, instanceId } 
                                        });
                                    }
                                }
                            }
                            
                            if (!isRegistered) {
                                retries++;
                                await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds before retry
                            }
                        } catch (error) {
                            logger.emit({ 
                                severityText: 'WARNING', 
                                body: `Error checking ECS registration for instance ${instanceId}: ${error}`, 
                                attributes: { serverId, instanceId, retry: retries, error: error instanceof Error ? error.message : String(error) } 
                            });
                            retries++;
                            await new Promise(resolve => setTimeout(resolve, 15000));
                        }
                    }
                    
                    if (!isRegistered) {
                        throw new Error(`Instance ${instanceId} failed to register with ECS cluster within 10 minutes. Check the instance user data logs at /var/log/user-data.log`);
                    }
                    
                    span.end();
                });

                // Notify user: Creating ECS service
                let serviceArn: string;
                await tracer.startActiveSpan('Create ECS Service', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🚀 [5/8] Launching ECS service...`);
                    logger.emit({ severityText: 'INFO', body: `Creating ECS service for server ID: ${serverId}`, attributes: { serverId } });

                    const serviceResponse = await ecsClient.send(new CreateServiceCommand({
                        cluster: awsRegionConfig.cluster_name,
                        serviceName: serverId,
                        taskDefinition: taskDefinitionArn,
                        desiredCount: 1,
                        launchType: "EC2",
                        placementConstraints: [
                            {
                                type: "memberOf",
                                expression: `attribute:server-id == ${serverId}`
                            }
                        ],
                        // No networkConfiguration needed for host network mode
                        // The container will use the EC2 instance's primary network interface
                    }));

                    serviceArn = serviceResponse.service?.serviceArn!;
                    if (!serviceArn) {
                        throw new Error("Failed to create ECS service");
                    }
                    span.end();
                });

                // Notify user: Waiting for service to be stable
                await tracer.startActiveSpan('Wait for Service Stable', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`⏳ [6/8] Waiting for service to be stable...`);
                    logger.emit({ severityText: 'INFO', body: `Waiting for ECS service to be stable: ${serverId}`, attributes: { serverId } });

                    await waitUntilServicesStable({
                        client: ecsClient,
                        maxWaitTime: 300,
                        maxDelay: 15,
                        minDelay: 15,
                        abortSignal: abortController.signal
                    }, {
                        cluster: awsRegionConfig.cluster_name,
                        services: [serviceArn]
                    });
                    span.end();
                });

                // Notify user: Getting public IP
                let publicIp: string = "";
                await tracer.startActiveSpan('Get Public IP', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🌐 [7/8] Retrieving public IP...`);
                    logger.emit({ severityText: 'INFO', body: `Getting public IP for server ID: ${serverId}`, attributes: { serverId } });

                    // Get the public IP directly from the EC2 instance
                    const describeInstanceResponse = await ec2Client.send(new DescribeInstancesCommand({
                        InstanceIds: [instanceId]
                    }));

                    const instance = describeInstanceResponse.Reservations?.[0]?.Instances?.[0];
                    if (!instance) {
                        throw new Error("EC2 instance not found");
                    }

                    publicIp = instance.PublicIpAddress || "";
                    if (!publicIp) {
                        throw new Error("Failed to retrieve public IP from EC2 instance. Instance may not be in a public subnet or may not have a public IP assigned.");
                    }

                    logger.emit({ 
                        severityText: 'INFO', 
                        body: `Retrieved public IP from EC2 instance: ${publicIp}`, 
                        attributes: { serverId, instanceId, publicIp } 
                    });

                    span.end();
                });

                // Notify user: Waiting for server to be ready
                let sdrAddress: string = "";
                await tracer.startActiveSpan('Wait for Server Ready', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🎮 [8/8] Waiting for TF2 server to respond to RCON Commands`);
                    logger.emit({ severityText: 'INFO', body: `Waiting for TF2 server to be ready: ${serverId}`, attributes: { serverId } });

                    const result = await waitUntil<{ sdrAddress: string }>(
                        async () => {
                            const result = await serverCommander.query({
                                command: "status",
                                host: publicIp!,
                                password: rconPassword,
                                port: 27015,
                                timeout: 5000,
                            });

                            const serverStatus = new ServerStatus(result);

                            if (!serverStatus.sourceTVIp) {
                                throw new Error("Server is not ready yet");
                            }

                            return {
                                sdrAddress: `${serverStatus.serverIp}:${serverStatus.serverPort}`,
                            };
                        },
                        {
                            timeout: 180000,
                            interval: 5000,
                            signal: abortController.signal
                        }
                    );

                    sdrAddress = result.sdrAddress;
                    span.end();
                });

                const [sdrIp, sdrPort] = sdrAddress.split(":");
                const endTime = Date.now();
                const durationSeconds = (endTime - startTime) / 1000;
                serverCreationDurationHistogram.record(durationSeconds, { region, variant: variantName });

                logger.emit({
                    severityText: 'INFO',
                    body: `Server deployment completed successfully: ${serverId}`,
                    attributes: { serverId, region, variant: variantName, duration: durationSeconds }
                });

                return {
                    serverId,
                    region,
                    variant: variantName,
                    hostIp: sdrIp,
                    hostPort: Number(sdrPort),
                    rconPassword,
                    rconAddress: publicIp,
                    hostPassword: serverPassword,
                    tvIp: publicIp,
                    tvPort: 27020,
                    tvPassword,
                };

            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to deploy server: ${serverId}`,
                    attributes: { serverId, error: error instanceof Error ? error.message : String(error) }
                });

                // Don't auto-cleanup on deployment failure - let the cleanup job handle it
                throw error;
            } finally {
                parentSpan.end();
                serverAbortManager.delete(serverId);
            }
        });
    }

    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        return await tracer.startActiveSpan('ECSServerManager.deleteServer', async (span: Span) => {
            span.setAttribute('serverId', args.serverId);
            const { awsClientFactory, configManager } = this.dependencies;
            const { region, serverId } = args;

            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];

                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ecsClient, ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);

                logger.emit({ severityText: 'INFO', body: `Starting server deletion: ${serverId}`, attributes: { serverId, region } });

                // Get the service to find the task definition
                const describeServiceResponse = await ecsClient.send(new DescribeServicesCommand({
                    cluster: awsRegionConfig.cluster_name,
                    services: [serverId],
                }));

                const service = describeServiceResponse.services?.[0];
                const taskDefinitionArn = service?.taskDefinition;

                // Delete the service with force flag
                await ecsClient.send(new DeleteServiceCommand({
                    cluster: awsRegionConfig.cluster_name,
                    service: serverId,
                    force: true,
                }));

                // Wait until service was deleted
                await waitUntil(async () => {
                    const describeServiceResponse = await ecsClient.send(new DescribeServicesCommand({
                        cluster: awsRegionConfig.cluster_name,
                        services: [serverId],
                    }));

                    const service = describeServiceResponse.services?.[0];
                    return service?.status === 'DELETED';
                });

                // Delete the TaskDefinition
                await ecsClient.send(new DeregisterTaskDefinitionCommand({
                    taskDefinition: taskDefinitionArn,
                }));

                // Terminate the dedicated EC2 instance
                await this.terminateGameServerInstance({ serverId, region });

                // Delete the security group
                await this.deleteSecurityGroup({ serverId, region });

                logger.emit({ severityText: 'INFO', body: `Server deletion completed: ${serverId}`, attributes: { serverId, region } });

            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to delete server: ${serverId}`,
                    attributes: { serverId, region, error: error instanceof Error ? error.message : String(error) }
                });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Creates a security group for the TF2 server with the necessary rules
     */
    private async createSecurityGroup(args: { serverId: string; region: Region }): Promise<string> {
        return await tracer.startActiveSpan('ECSServerManager.createSecurityGroup', async (span: Span) => {
            span.setAttribute('serverId', args.serverId);
            const { awsClientFactory, configManager } = this.dependencies;
            const { region, serverId } = args;

            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];

                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);

                logger.emit({ severityText: 'INFO', body: `Creating security group for server: ${serverId}`, attributes: { serverId, region } });

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

                logger.emit({
                    severityText: 'INFO',
                    body: `Security group created successfully: ${securityGroupId}`,
                    attributes: { serverId, region, securityGroupId }
                });

                return securityGroupId;

            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to create security group for server: ${serverId}`,
                    attributes: { serverId, region, error: error instanceof Error ? error.message : String(error) }
                });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Deletes the security group for the TF2 server
     */
    private async deleteSecurityGroup(args: { serverId: string; region: Region }): Promise<void> {
        return await tracer.startActiveSpan('ECSServerManager.deleteSecurityGroup', async (span: Span) => {
            span.setAttribute('serverId', args.serverId);
            const { awsClientFactory, configManager } = this.dependencies;
            const { region, serverId } = args;

            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];

                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);

                logger.emit({ severityText: 'INFO', body: `Deleting security group for server: ${serverId}`, attributes: { serverId, region } });

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
                    logger.emit({
                        severityText: 'WARN',
                        body: `Security group not found for server: ${serverId}`,
                        attributes: { serverId, region }
                    });
                    return;
                }

                // Delete the security group
                await ec2Client.send(new DeleteSecurityGroupCommand({
                    GroupId: securityGroup.GroupId!,
                }));

                logger.emit({
                    severityText: 'INFO',
                    body: `Security group deleted successfully: ${securityGroup.GroupId}`,
                    attributes: { serverId, region, securityGroupId: securityGroup.GroupId }
                });

            } catch (error) {
                // Don't throw on security group deletion failure, just log it
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to delete security group for server: ${serverId}`,
                    attributes: { serverId, region, error: error instanceof Error ? error.message : String(error) }
                });
            } finally {
                span.end();
            }
        });
    }

    /**
     * Maps variant configuration to appropriate EC2 instance type
     */
    private getInstanceTypeForVariant(ocpu: number, memory: number): _InstanceType {
        // Validate that variant specs don't exceed t3.medium capabilities
        if (ocpu > 1 || memory > 4) {
            throw new Error(`Variant configuration exceeds t3.medium capabilities: ${ocpu} OCPU and ${memory}GB memory requested, but maximum is 1 OCPU and 4GB memory`);
        }
        
        // Always use t3.medium (2 vCPU, 4 GB RAM)
        return _InstanceType.t3_medium;
    }

    /**
     * Creates a dedicated EC2 instance for the game server
     */
    private async createGameServerInstance(args: { 
        serverId: string; 
        region: Region; 
        variantConfig: any; 
        securityGroupId: string 
    }): Promise<string> {
        return await tracer.startActiveSpan('ECSServerManager.createGameServerInstance', async (span: Span) => {
            span.setAttribute('serverId', args.serverId);
            const { awsClientFactory, configManager } = this.dependencies;
            const { region, serverId, variantConfig, securityGroupId } = args;
            
            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];
                
                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);
                
                // Get the appropriate instance type
                const instanceType = this.getInstanceTypeForVariant(variantConfig.ocpu, variantConfig.memory);
                
                logger.emit({ 
                    severityText: 'INFO', 
                    body: `Creating EC2 instance for game server: ${serverId} with type: ${instanceType}`, 
                    attributes: { serverId, region, instanceType } 
                });

                // Get ECS-optimized AMI ID (use more specific filter)
                const imageResponse = await ec2Client.send(new DescribeImagesCommand({
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

                logger.emit({ 
                    severityText: 'INFO', 
                    body: `Using ECS-optimized AMI: ${latestImage.ImageId} (${latestImage.Name})`, 
                    attributes: { serverId, region, amiId: latestImage.ImageId, amiName: latestImage.Name } 
                });

                // User data script to register with ECS cluster (AWS-recommended approach)
                const userData = Buffer.from(`#!/bin/bash
# Log all output for debugging
exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting ECS agent configuration..."
echo "Cluster name: ${awsRegionConfig.cluster_name}"
echo "Server ID: ${serverId}"
echo "Region: ${awsRegionConfig.rootRegion}"

# Configure ECS agent - this is all that's needed on ECS-optimized AMI
# AWS Documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bootstrap_container_instance.html
cat <<'EOF' >> /etc/ecs/ecs.config
ECS_CLUSTER=${awsRegionConfig.cluster_name}
ECS_INSTANCE_ATTRIBUTES={"server-id":"${serverId}"}
ECS_ENABLE_CONTAINER_METADATA=true
ECS_AVAILABLE_LOGGING_DRIVERS=["json-file","awslogs"]
ECS_LOGLEVEL=info
ECS_ENABLE_TASK_IAM_ROLE=true
EOF

echo "ECS configuration written successfully"
echo "Final ECS config contents:"
cat /etc/ecs/ecs.config

# Test network connectivity to ECS (for debugging)
echo "Testing network connectivity to ECS..."
curl -I https://ecs.${awsRegionConfig.rootRegion}.amazonaws.com/ 2>&1 || echo "ECS endpoint check failed"

# Check IAM role (for debugging)
echo "Checking IAM role..."
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ || echo "No IAM role attached"

echo "ECS configuration completed - services will start automatically via systemd"
echo "Note: Amazon Linux 2 systemd will automatically start Docker and ECS services"
`).toString('base64');

                // Create the EC2 instance
                const runResponse = await ec2Client.send(new RunInstancesCommand({
                    ImageId: latestImage.ImageId!,
                    InstanceType: instanceType,
                    MinCount: 1,
                    MaxCount: 1,
                    SecurityGroupIds: [securityGroupId],
                    SubnetId: awsRegionConfig.subnet_id,
                    UserData: userData,
                    IamInstanceProfile: {
                        Arn: awsRegionConfig.instance_profile_arn
                    },
                    TagSpecifications: [
                        {
                            ResourceType: 'instance',
                            Tags: [
                                {
                                    Key: 'Name',
                                    Value: `TF2-GameServer-${serverId}`
                                },
                                {
                                    Key: 'ServerID',
                                    Value: serverId
                                },
                                {
                                    Key: 'ManagedBy',
                                    Value: 'TF2-QuickServer'
                                }
                            ]
                        }
                    ]
                }));

                const instanceId = runResponse.Instances![0].InstanceId!;
                
                logger.emit({ 
                    severityText: 'INFO', 
                    body: `EC2 instance created: ${instanceId} for server: ${serverId}`, 
                    attributes: { serverId, region, instanceId, instanceType } 
                });

                return instanceId;

            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to create EC2 instance for server: ${serverId}`,
                    attributes: { serverId, region, error: error instanceof Error ? error.message : String(error) }
                });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Terminates the dedicated EC2 instance for the game server
     */
    private async terminateGameServerInstance(args: { serverId: string; region: Region }): Promise<void> {
        return await tracer.startActiveSpan('ECSServerManager.terminateGameServerInstance', async (span: Span) => {
            span.setAttribute('serverId', args.serverId);
            const { awsClientFactory, configManager } = this.dependencies;
            const { region, serverId } = args;
            
            try {
                const awsConfig = configManager.getAWSConfig();
                const awsRegionConfig = awsConfig.regions[region];
                
                if (!awsRegionConfig) {
                    throw new Error(`Region ${region} is not configured in AWS config`);
                }

                const { ec2Client } = awsClientFactory(awsRegionConfig.rootRegion);
                
                // Find the instance by server ID tag
                const describeResponse = await ec2Client.send(new DescribeInstancesCommand({
                    Filters: [
                        {
                            Name: 'tag:ServerID',
                            Values: [serverId]
                        },
                        {
                            Name: 'instance-state-name',
                            Values: ['running', 'pending', 'stopping']
                        }
                    ]
                }));

                const instances = describeResponse.Reservations?.flatMap(r => r.Instances || []) || [];
                
                if (instances.length === 0) {
                    logger.emit({ 
                        severityText: 'WARNING', 
                        body: `No EC2 instance found for server: ${serverId}`, 
                        attributes: { serverId, region } 
                    });
                    return;
                }

                const instanceIds = instances.map(i => i.InstanceId!);
                
                logger.emit({ 
                    severityText: 'INFO', 
                    body: `Terminating EC2 instances for server: ${serverId}`, 
                    attributes: { serverId, region, instanceIds } 
                });

                await ec2Client.send(new TerminateInstancesCommand({
                    InstanceIds: instanceIds
                }));

                logger.emit({ 
                    severityText: 'INFO', 
                    body: `EC2 instances termination initiated for server: ${serverId}`, 
                    attributes: { serverId, region, instanceIds } 
                });

            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `Failed to terminate EC2 instance for server: ${serverId}`,
                    attributes: { serverId, region, error: error instanceof Error ? error.message : String(error) }
                });
                // Don't throw - we still want to continue with other cleanup
            } finally {
                span.end();
            }
        });
    }
}
