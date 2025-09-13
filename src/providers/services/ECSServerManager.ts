import {
    CreateServiceCommand,
    DeleteServiceCommand,
    DeregisterTaskDefinitionCommand,
    DescribeServicesCommand,
    DescribeTasksCommand,
    ListTasksCommand,
    RegisterTaskDefinitionCommand,
    waitUntilServicesStable
} from "@aws-sdk/client-ecs";
import {
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand,
    AuthorizeSecurityGroupIngressCommand,
    DescribeNetworkInterfacesCommand
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
                const environmentArray = Object.entries(environmentVariables).map(([name, value]) => ({ name, value }));

                // Notify user: Creating task definition
                let taskDefinitionArn: string;
                await tracer.startActiveSpan('Register Task Definition', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`📋 [1/5] Creating task definition...`);
                    logger.emit({ severityText: 'INFO', body: `Registering task definition for server ID: ${serverId}`, attributes: { serverId } });

                    const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
                        family: serverId,
                        networkMode: "awsvpc",
                        requiresCompatibilities: ["FARGATE"],
                        cpu: (variantConfig.ocpu * 1024).toString(), // Convert OCPU to ECS CPU units (1 OCPU = 1024 CPU units)
                        memory: (variantConfig.memory * 1024).toString(), // Convert GB to MB
                        executionRoleArn: awsRegionConfig.task_execution_role_arn,
                        taskRoleArn: awsRegionConfig.task_role_arn,
                        // TODO: Add Shield and NewRelic Containers
                        containerDefinitions: [
                            {
                                name: "tf2-server",
                                image: containerImage,
                                essential: true,
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
                                        protocol: "tcp"
                                    },
                                    {
                                        containerPort: 27015,
                                        protocol: "udp"
                                    },
                                    {
                                        containerPort: 27020,
                                        protocol: "tcp"
                                    },
                                    {
                                        containerPort: 27020,
                                        protocol: "udp"
                                    }
                                ],
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
                    await statusUpdater(`🔒 [2/6] Creating security group...`);
                    securityGroupId = await this.createSecurityGroup({ serverId, region });
                    span.end();
                });

                // Notify user: Creating ECS service
                let serviceArn: string;
                await tracer.startActiveSpan('Create ECS Service', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🚀 [3/6] Launching ECS service...`);
                    logger.emit({ severityText: 'INFO', body: `Creating ECS service for server ID: ${serverId}`, attributes: { serverId } });

                    const serviceResponse = await ecsClient.send(new CreateServiceCommand({
                        cluster: awsRegionConfig.cluster_name,
                        serviceName: serverId,
                        taskDefinition: taskDefinitionArn,
                        desiredCount: 1,
                        launchType: "FARGATE",
                        networkConfiguration: {
                            awsvpcConfiguration: {
                                subnets: [awsRegionConfig.subnet_id],
                                securityGroups: [securityGroupId],
                                assignPublicIp: "ENABLED",
                            },
                        },
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
                    await statusUpdater(`⏳ [4/6] Waiting for service to be stable...`);
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
                    await statusUpdater(`🌐 [5/6] Retrieving public IP...`);
                    logger.emit({ severityText: 'INFO', body: `Getting public IP for server ID: ${serverId}`, attributes: { serverId } });

                    // List tasks associated with the service
                    const listTasksResponse = await ecsClient.send(
                        new ListTasksCommand({
                            cluster: awsRegionConfig.cluster_name,
                            serviceName: serverId
                        })
                    );

                    const taskArn = listTasksResponse.taskArns?.[0];
                    if (!taskArn) {
                        throw new Error("No tasks found for the service");
                    }

                    // Get the public IP of the task
                    const taskResponse = await ecsClient.send(new DescribeTasksCommand({
                        cluster: awsRegionConfig.cluster_name,
                        tasks: [taskArn],
                    }));

                    const task = taskResponse.tasks?.[0];
                    if (!task) {
                        throw new Error("Task not found");
                    }

                    const eniId = task.attachments?.[0]?.details?.find(detail => detail.name === "networkInterfaceId")?.value;
                    if (!eniId) {
                        throw new Error("Network interface ID not found");
                    }

                    const networkInterfaceResponse = await ec2Client.send(new DescribeNetworkInterfacesCommand({
                        NetworkInterfaceIds: [eniId],
                    }));

                    const networkInterface = networkInterfaceResponse.NetworkInterfaces?.[0];
                    if (!networkInterface) {
                        throw new Error("Network interface not found");
                    }

                    publicIp = networkInterface.Association?.PublicIp!;
                    if (!publicIp) {
                        throw new Error("Failed to retrieve public IP");
                    }
                    span.end();
                });

                // Notify user: Waiting for server to be ready
                let sdrAddress: string = "";
                await tracer.startActiveSpan('Wait for Server Ready', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🎮 [6/6] Waiting for TF2 server to be ready...`);
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

                // Clean up on error
                try {
                    await this.deleteServer({ serverId, region });
                } catch (cleanupError) {
                    logger.emit({
                        severityText: 'WARN',
                        body: `Failed to cleanup server after deployment error: ${serverId}`,
                        attributes: { serverId, cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) }
                    });
                }
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
}
