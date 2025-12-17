import {
    ContainerDefinition,
    DeleteTaskDefinitionsCommand,
    ListTaskDefinitionsCommand,
    RegisterTaskDefinitionCommand,
    TransportProtocol
} from "@aws-sdk/client-ecs";
import { Region } from '@tf2qs/core';
import { DeploymentContext } from '@tf2qs/core';
import { ServerCredentials } from '@tf2qs/core';
import { ConfigManager } from "@tf2qs/core";
import { OperationTracingService } from "@tf2qs/telemetry";
import { TaskDefinitionService as TaskDefinitionServiceInterface } from '../interfaces';
import { AWSConfigService } from "./AWSConfigService";

/**
 * Service responsible for managing ECS Task Definitions for TF2 servers
 */
export class DefaultTaskDefinitionService implements TaskDefinitionServiceInterface {

    constructor(
        private readonly configManager: ConfigManager,
        private readonly awsConfigService: AWSConfigService,
        private readonly tracingService: OperationTracingService
    ) { }

    async create(
        context: DeploymentContext,
        credentials: ServerCredentials,
        environment: Record<string, string>
    ): Promise<string> {
        return this.tracingService.executeWithTracing(
            'TaskDefinitionService.create',
            context.serverId,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(context.region);
                const { ecsClient } = this.awsConfigService.getClients(context.region);
                const variantConfig = await this.configManager.getVariantConfig({ 
                    variant: context.variantName, 
                    guildId: context.guildId 
                });

                this.tracingService.logOperationStart('Registering task definition', context.serverId, context.region);

                // Convert environment to ECS format
                const environmentArray = Object.entries(environment).map(([name, value]: [string, string]) => ({
                    name,
                    value
                }));

                // Build container definitions array starting with the main TF2 server
                const containerDefinitions: ContainerDefinition[] = [
                    {
                        name: "tf2-server",
                        image: variantConfig.image,
                        essential: true,
                        cpu: 1536,
                        memory: 3584, // Reserve 3.5GB for the game server
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
                                protocol: TransportProtocol.TCP
                            },
                            {
                                containerPort: 27015,
                                hostPort: 27015,
                                protocol: TransportProtocol.UDP
                            },
                            {
                                containerPort: 27020,
                                hostPort: 27020,
                                protocol: TransportProtocol.TCP
                            },
                            {
                                containerPort: 27020,
                                hostPort: 27020,
                                protocol: TransportProtocol.UDP
                            }
                        ],
                        // TODO: Remove logging to reduce cost
                        // logConfiguration: {
                        //     logDriver: "awslogs",
                        //     options: {
                        //         "awslogs-group": awsRegionConfig.log_group_name,
                        //         "awslogs-region": awsRegionConfig.rootRegion,
                        //         "awslogs-stream-prefix": `tf2-server-${context.serverId}`
                        //     }
                        // }
                    }
                ];

                // Conditionally add NewRelic infrastructure monitoring sidecar
                if (process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_LICENSE_KEY !== "") {
                    containerDefinitions.push({
                        name: "newrelic-infra",
                        image: "newrelic/infrastructure:latest",
                        essential: false,
                        cpu: 128,
                        memory: 256,
                        environment: [
                            {
                                name: "NRIA_LICENSE_KEY",
                                value: process.env.NEW_RELIC_LICENSE_KEY
                            },
                            {
                                name: "NRIA_DISPLAY_NAME",
                                value: `TF2-Server-${context.region}-${context.serverId}`
                            },
                            {
                                name: "NRIA_OVERRIDE_HOSTNAME",
                                value: `tf2-server-${context.region}-${context.serverId}`
                            },
                            {
                                name: "NRIA_CUSTOM_ATTRIBUTES",
                                value: `region=${context.region},serverId=${context.serverId},variant=${context.variantName}`
                            }
                        ]
                    });
                }

                const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
                    family: context.serverId,
                    networkMode: "host",
                    requiresCompatibilities: ["EC2"],
                    executionRoleArn: awsRegionConfig.task_execution_role_arn,
                    taskRoleArn: awsRegionConfig.task_role_arn,
                    containerDefinitions,
                }));

                const taskDefinitionArn = taskDefinitionResponse.taskDefinition?.taskDefinitionArn;
                if (!taskDefinitionArn) {
                    throw new Error("Failed to register task definition");
                }

                this.tracingService.logOperationSuccess('Task definition registered', context.serverId, context.region, {
                    taskDefinitionArn
                });

                return taskDefinitionArn;
            }
        );
    }

    async delete(serverId: string, region: Region): Promise<void> {
        return this.tracingService.executeWithTracing(
            'TaskDefinitionService.delete',
            serverId,
            async () => {
                const { ecsClient } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Deleting task definition', serverId, region);

                // Find the TaskDefinitionARN by the Family Name
                const taskDefinitionArn = await this.findTaskDefinitionArn(serverId, region);
                if(!taskDefinitionArn){
                    this.tracingService.logOperationSuccess('Task definition not found, already deleted', serverId, region);
                    return;
                }
                await ecsClient.send(new DeleteTaskDefinitionsCommand({
                    taskDefinitions: [taskDefinitionArn]
                }));

                this.tracingService.logOperationSuccess('Task definition deleted', serverId, region);
            }
        );
    }
    async findTaskDefinitionArn(serverId: string, region: Region) {
        const { ecsClient } = this.awsConfigService.getClients(region);
        const response = await ecsClient.send(new ListTaskDefinitionsCommand({
            familyPrefix: serverId,
            sort: "DESC",
            maxResults: 1
        }));

        const taskDefinitionArn = response.taskDefinitionArns?.[0];
        if (!taskDefinitionArn) {
            return undefined;
        }
        return taskDefinitionArn;
    }
}
