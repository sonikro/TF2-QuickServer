import {
    CreateServiceCommand,
    DeleteServiceCommand,
    DescribeServicesCommand,
    waitUntilServicesStable,
} from "@aws-sdk/client-ecs";
import { Region } from '@tf2qs/core/src/domain';
import { OperationTracingService } from "@tf2qs/telemetry/src/OperationTracingService";
import { waitUntil } from "../../../utils/waitUntil";
import { ECSServiceManager as ECSServiceManagerInterface } from '../interfaces';
import { AWSConfigService } from "./AWSConfigService";

export class DefaultECSServiceManager implements ECSServiceManagerInterface {

    constructor(
        private readonly awsConfigService: AWSConfigService,
        private readonly tracingService: OperationTracingService
    ) { }

    async create(
        serverId: string,
        region: Region,
        taskDefinitionArn: string
    ): Promise<string> {
        return this.tracingService.executeWithTracing(
            'ECSServiceManager.create',
            serverId,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(region);
                const { ecsClient } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Creating ECS service', serverId, region);

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

                this.tracingService.logOperationSuccess('ECS service created', serverId, region, { serviceArn });
                return serviceArn;
            }
        );
    }

    async waitForStable(
        serviceArn: string,
        region: Region,
        abortSignal?: AbortSignal
    ): Promise<void> {
        return this.tracingService.executeWithTracing(
            'ECSServiceManager.waitForStable',
            serviceArn,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(region);
                const { ecsClient } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Waiting for ECS service to be stable', serviceArn, region);

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

                this.tracingService.logOperationSuccess('ECS service is stable', serviceArn, region);
            }
        );
    }

    async delete(serverId: string, region: Region): Promise<void> {
        return this.tracingService.executeWithTracing(
            'ECSServiceManager.delete',
            serverId,
            async () => {
                const awsRegionConfig = this.awsConfigService.getRegionConfig(region);
                const { ecsClient } = this.awsConfigService.getClients(region);

                this.tracingService.logOperationStart('Deleting ECS service', serverId, region);

                try {
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

                    this.tracingService.logOperationSuccess('ECS service deleted', serverId, region);
                } catch (error: any) {
                    if (this.isServiceNotFoundError(error)) {
                        this.tracingService.logOperationSuccess('ECS service not found (already deleted)', serverId, region);
                        return;
                    }
                    throw error;
                }
            }
        );
    }

    private isServiceNotFoundError(error: any): boolean {
        const errorName = error.name || '';
        const errorCode = error.Code || '';
        const errorMessage = error.message || '';

        return (
            errorName === 'ServiceNotFoundException' ||
            errorCode === 'ServiceNotFoundException' ||
            errorMessage.includes('ServiceNotFoundException') ||
            errorMessage.includes('service was not found')
        );
    }
}
