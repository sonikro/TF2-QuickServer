import { Region, Server, Variant } from '@tf2qs/core';
import { ServerCredentials } from '@tf2qs/core';
import { DeploymentContext } from '@tf2qs/core';
import { EnvironmentBuilderService } from '@tf2qs/core';
import { PasswordGeneratorService } from '@tf2qs/core';
import { ServerCommander } from '@tf2qs/core';
import { ServerManager } from '@tf2qs/core';
import { StatusUpdater } from '@tf2qs/core';
import { TF2ServerReadinessService } from '@tf2qs/core';
import { ConfigManager } from '@tf2qs/core';
import { OperationTracingService } from '@tf2qs/telemetry';
import { logger } from '@tf2qs/telemetry';
import { DefaultEnvironmentBuilderService, DefaultTF2ServerReadinessService } from '../../services';
import { AWSClientFactory } from '../../services/defaultAWSServiceFactory';
import {
    EC2InstanceService,
    ECSServiceManager,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService
} from './interfaces';
import { AWSServerDeploymentResult } from './models/AWSServerDeploymentResult';
import { DefaultEC2InstanceService, DefaultECSServiceManager, DefaultNetworkService, DefaultSecurityGroupService, DefaultTaskDefinitionService } from './services';
import { AWSConfigService } from './services/AWSConfigService';


export interface AWSServerManagerDependencies {
    configManager: ConfigManager;
    awsClientFactory: AWSClientFactory;
    serverCommander: ServerCommander;
    passwordGeneratorService: PasswordGeneratorService;
}

/**
 * Main ECS Server Manager that coordinates all the individual services
 * to deploy a TF2 server. This class follows the Single Responsibility Principle
 * by delegating specific tasks to focused services and implements the ServerManager interface.
 */
export class AWSServerManager implements ServerManager {

    /**
     * Factory method to create an instance of AWSServerManager
     * @param dependencies 
     * @returns 
     */
    static create(dependencies: AWSServerManagerDependencies): AWSServerManager {
        const { configManager, awsClientFactory, serverCommander, passwordGeneratorService } = dependencies;

        const awsConfigService = new AWSConfigService(configManager, awsClientFactory);
        const operationTracer = new OperationTracingService();

        const taskDefinitionService = new DefaultTaskDefinitionService(configManager, awsConfigService, operationTracer);
        const ecsServiceManager = new DefaultECSServiceManager(awsConfigService, operationTracer);
        const securityGroupService = new DefaultSecurityGroupService(awsConfigService, operationTracer);
        const networkService = new DefaultNetworkService(awsConfigService, operationTracer);
        const ec2InstanceService = new DefaultEC2InstanceService(awsConfigService, operationTracer);

        const environmentBuilderService = new DefaultEnvironmentBuilderService();
        const tf2ServerReadinessService = new DefaultTF2ServerReadinessService(serverCommander);

        return new AWSServerManager(
            taskDefinitionService,
            securityGroupService,
            ec2InstanceService,
            ecsServiceManager,
            networkService,
            tf2ServerReadinessService,
            environmentBuilderService,
            passwordGeneratorService,
            configManager
        );
    }

    constructor(
        private readonly taskDefinitionService: TaskDefinitionService,
        private readonly securityGroupService: SecurityGroupService,
        private readonly ec2InstanceService: EC2InstanceService,
        private readonly ecsServiceManager: ECSServiceManager,
        private readonly networkService: NetworkService,
        private readonly tf2ServerReadinessService: TF2ServerReadinessService,
        private readonly environmentBuilderService: EnvironmentBuilderService,
        private readonly passwordGeneratorService: PasswordGeneratorService,
        private readonly configManager: ConfigManager,
    ) { }

    /**
     * Deploys a new TF2 server in the selected region with a specific variant.
     */
    async deployServer(args: {
        serverId: string;
        region: Region;
        variantName: Variant;
        statusUpdater: StatusUpdater;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }): Promise<Server> {
        // Convert the arguments to DeploymentContext
        const context = new DeploymentContext({
            serverId: args.serverId,
            region: args.region,
            variantName: args.variantName,
            statusUpdater: args.statusUpdater,
            sourcemodAdminSteamId: args.sourcemodAdminSteamId,
            guildId: args.guildId,
            extraEnvs: args.extraEnvs,
        });

        try {
            logger.emit({
                severityText: 'INFO',
                body: `Starting server deployment: ${args.serverId}`,
                attributes: { serverId: args.serverId, region: args.region, variant: args.variantName }
            });

            // Generate server credentials
            const credentials = ServerCredentials.generate(this.passwordGeneratorService);

            // Get configuration
            const variantConfig = await this.configManager.getVariantConfig({ 
                variant: args.variantName, 
                guildId: args.guildId 
            });
            const regionConfig = this.configManager.getRegionConfig(args.region);

            // Build environment variables
            const environment = this.environmentBuilderService.build(context, credentials, variantConfig, regionConfig);

            // Deployment steps
            const result = await this.executeDeployment(context, credentials, environment, variantConfig);

            logger.emit({
                severityText: 'INFO',
                body: `Server deployment completed: ${args.serverId}`,
                attributes: {
                    serverId: args.serverId,
                    region: args.region,
                    publicIp: result.publicIp,
                    sdrAddress: result.sdrAddress
                }
            });

            return {
                serverId: result.serverId,
                region: args.region,
                variant: args.variantName,
                hostIp: result.sdrHost,
                hostPort: result.sdrPort,
                tvIp: result.publicIp,
                tvPort: result.tvPort,
                rconPassword: result.rconPassword,
                rconAddress: result.publicIp,
                hostPassword: result.serverPassword,
                tvPassword: result.tvPassword,
            };

        } catch (error) {
            logger.emit({
                severityText: 'ERROR',
                body: `Server deployment failed: ${args.serverId}`,
                attributes: {
                    serverId: args.serverId,
                    region: args.region,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            throw error;
        }
    }

    private async executeDeployment(
        context: DeploymentContext,
        credentials: any,
        environment: Record<string, string>,
        variantConfig: any
    ): Promise<AWSServerDeploymentResult> {
        // Update status: Creating security group
        await context.statusUpdater("🛡️ [1/7] Creating security group...");
        const securityGroupId = await this.securityGroupService.create(context.serverId, context.region);

        // Update status: Creating task definition
        await context.statusUpdater("📋 [2/7] Creating task definition...");
        const taskDefinitionArn = await this.taskDefinitionService.create(context, credentials, environment);

        // Update status: Launching EC2 instance
        await context.statusUpdater("🖥️ [3/7] Launching EC2 instance...");
        const instanceId = await this.ec2InstanceService.create({
            serverId: context.serverId,
            region: context.region,
            variantConfig,
            securityGroupId,
        });

        // Update status: Creating ECS service
        await context.statusUpdater("🚀 [4/7] Creating ECS service...");
        const serviceArn = await this.ecsServiceManager.create(context.serverId, context.region, taskDefinitionArn);

        // Update status: Waiting for service to stabilize
        await context.statusUpdater("⏳ [5/7] Waiting for service to stabilize (this can take up to 15 minutes in AWS Experimental Zones)...");
        await this.ecsServiceManager.waitForStable(serviceArn, context.region);

        // Update status: Getting public IP
        await context.statusUpdater("🌐 [6/7] Getting public IP...");
        const publicIp = await this.networkService.getPublicIp(instanceId, context.region);

        // Update status: Waiting for server to be ready
        await context.statusUpdater("🔄 [7/7] Waiting for TF2 server to be ready to receive RCON Commands...");
        const sdrAddress = await this.tf2ServerReadinessService.waitForReady(
            publicIp,
            credentials.rconPassword,
            context.serverId
        );

        return new AWSServerDeploymentResult({
            serverId: context.serverId,
            publicIp,
            rconPassword: credentials.rconPassword,
            serverPassword: credentials.serverPassword,
            tvPassword: credentials.tvPassword,
            sdrAddress,
            instanceId,
            securityGroupId,
            taskDefinitionArn,
            serviceArn,
        });
    }

    /**
     * Deletes an existing TF2 server. This operation is idempotent and follows
     * a specific deletion order to avoid dependency conflicts.
     *
     * Deletion order:
     * 1. ECS Service - must be deleted first as it manages tasks
     * 2. EC2 Instance - must be terminated before security group
     * 3. Task Definition - can be deleted after service
     * 4. Security Group - deleted last as it may have dependencies on ENIs
     *    The security group service includes retry logic for dependency violations
     */
    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        const { serverId, region } = args;
        logger.emit({
            severityText: 'INFO',
            body: `Starting server destruction: ${serverId}`,
            attributes: { serverId, region }
        });

        try {
            await this.ecsServiceManager.delete(serverId, region);

            await this.ec2InstanceService.terminate(serverId, region);

            await this.taskDefinitionService.delete(serverId, region);

            await this.securityGroupService.delete(serverId, region);

            logger.emit({
                severityText: 'INFO',
                body: `Server destruction completed: ${serverId}`,
                attributes: { serverId, region }
            });

        } catch (error) {
            logger.emit({
                severityText: 'ERROR',
                body: `Server destruction failed: ${serverId}`,
                attributes: {
                    serverId,
                    region,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            throw error;
        }
    }
}
