import {
    CreateServiceCommand,
    DeleteServiceCommand,
    DescribeServicesCommand,
    waitUntilServicesStable,
} from "@aws-sdk/client-ecs";
import { Region } from '../../../../core/domain';
import { ECSServiceManager as ECSServiceManagerInterface } from '../interfaces';
import { AWSResourceManagerBase } from '../base/AWSResourceManagerBase';
import { waitUntil } from "../../../utils/waitUntil";

/**
 * Service responsible for managing ECS Services for TF2 servers
 */
export class DefaultECSServiceManager extends AWSResourceManagerBase implements ECSServiceManagerInterface {
    
    async create(
        serverId: string,
        region: Region,
        taskDefinitionArn: string
    ): Promise<string> {
        return this.executeWithTracing(
            'ECSServiceManager.create',
            serverId,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(region);
                const { ecsClient } = this.getAWSClients(region);

                this.logOperationStart('Creating ECS service', serverId, region);

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
                }));

                const serviceArn = serviceResponse.service?.serviceArn;
                if (!serviceArn) {
                    throw new Error("Failed to create ECS service");
                }

                this.logOperationSuccess('ECS service created', serverId, region, { serviceArn });
                return serviceArn;
            }
        );
    }

    async waitForStable(
        serviceArn: string,
        region: Region,
        abortSignal?: AbortSignal
    ): Promise<void> {
        return this.executeWithTracing(
            'ECSServiceManager.waitForStable',
            serviceArn,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(region);
                const { ecsClient } = this.getAWSClients(region);

                this.logOperationStart('Waiting for ECS service to be stable', serviceArn, region);

                await waitUntilServicesStable({
                    client: ecsClient,
                    maxWaitTime: 900,
                    maxDelay: 15,
                    minDelay: 15,
                    abortSignal
                }, {
                    cluster: awsRegionConfig.cluster_name,
                    services: [serviceArn]
                });

                this.logOperationSuccess('ECS service is stable', serviceArn, region);
            }
        );
    }

    async delete(serverId: string, region: Region): Promise<void> {
        return this.executeWithTracing(
            'ECSServiceManager.delete',
            serverId,
            async () => {
                const awsRegionConfig = this.getAWSRegionConfig(region);
                const { ecsClient } = this.getAWSClients(region);

                this.logOperationStart('Deleting ECS service', serverId, region);

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

                this.logOperationSuccess('ECS service deleted', serverId, region);
            }
        );
    }
}
