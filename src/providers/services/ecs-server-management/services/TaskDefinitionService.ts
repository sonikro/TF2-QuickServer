import {
    RegisterTaskDefinitionCommand,
    DeregisterTaskDefinitionCommand,
} from "@aws-sdk/client-ecs";
import { Region } from '../../../../core/domain';
import { DeploymentContext } from '../models/DeploymentContext';
import { ServerCredentials } from '../models/ServerCredentials';
import { TaskDefinitionService as TaskDefinitionServiceInterface } from '../interfaces';
import { AWSResourceManagerBase } from '../base/AWSResourceManagerBase';

/**
 * Service responsible for managing ECS Task Definitions for TF2 servers
 */
export class DefaultTaskDefinitionService extends AWSResourceManagerBase implements TaskDefinitionServiceInterface {
    
    async create(
        context: DeploymentContext,
        credentials: ServerCredentials,
        environment: Record<string, string>
    ): Promise<string> {
        return this.executeWithTracing(
            'TaskDefinitionService.create',
            context.serverId,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(context.region);
                const { ecsClient } = this.getAWSClients(context.region);
                const variantConfig = this.configManager.getVariantConfig(context.variantName);

                this.logOperationStart('Registering task definition', context.serverId, context.region);

                // Convert environment to ECS format
                const environmentArray = Object.entries(environment).map(([name, value]: [string, string]) => ({ 
                    name, 
                    value 
                }));

                const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
                    family: context.serverId,
                    networkMode: "host",
                    requiresCompatibilities: ["EC2"],
                    executionRoleArn: awsRegionConfig.task_execution_role_arn,
                    taskRoleArn: awsRegionConfig.task_role_arn,
                    containerDefinitions: [
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
                            // TODO: Remove logging to reduce cost
                            // logConfiguration: {
                            //     logDriver: "awslogs",
                            //     options: {
                            //         "awslogs-group": awsRegionConfig.log_group_name,
                            //         "awslogs-region": awsRegionConfig.rootRegion,
                            //         "awslogs-stream-prefix": `tf2-server-${context.serverId}`
                            //     }
                            // }
                        },
                    ],
                }));

                const taskDefinitionArn = taskDefinitionResponse.taskDefinition?.taskDefinitionArn;
                if (!taskDefinitionArn) {
                    throw new Error("Failed to register task definition");
                }

                this.logOperationSuccess('Task definition registered', context.serverId, context.region, { 
                    taskDefinitionArn 
                });
                
                return taskDefinitionArn;
            }
        );
    }

    async delete(taskDefinitionArn: string, region: Region): Promise<void> {
        return this.executeWithTracing(
            'TaskDefinitionService.delete',
            taskDefinitionArn,
            async () => {
                const { ecsClient } = this.getAWSClients(region);

                this.logOperationStart('Deregistering task definition', taskDefinitionArn, region);

                await ecsClient.send(new DeregisterTaskDefinitionCommand({
                    taskDefinition: taskDefinitionArn,
                }));

                this.logOperationSuccess('Task definition deregistered', taskDefinitionArn, region);
            }
        );
    }
}
