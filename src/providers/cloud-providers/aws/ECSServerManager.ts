import { Region, Server, Variant } from '../../../core/domain';
import { ServerCredentials } from '../../../core/models';
import { DeploymentContext } from '../../../core/models/DeploymentContext';
import { EnvironmentBuilderService } from '../../../core/services/EnvironmentBuilderService';
import { PasswordGeneratorService } from '../../../core/services/PasswordGeneratorService';
import { ServerManager } from '../../../core/services/ServerManager';
import { StatusUpdater } from '../../../core/services/StatusUpdater';
import { TF2ServerReadinessService } from '../../../core/services/TF2ServerReadinessService';
import { ConfigManager } from '../../../core/utils/ConfigManager';
import { logger } from '../../../telemetry/otel';
import {
    EC2InstanceService,
    ECSServiceManager,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService
} from './interfaces';
import { AWSServerDeploymentResult } from './models/AWSServerDeploymentResult';

/**
 * Main ECS Server Manager that coordinates all the individual services
 * to deploy a TF2 server. This class follows the Single Responsibility Principle
 * by delegating specific tasks to focused services and implements the ServerManager interface.
 */
export class ECSServerManager implements ServerManager {
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
    ) {}

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
            const variantConfig = this.configManager.getVariantConfig(args.variantName);
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

            const [sdrIp, sdrPort] = result.sdrAddress.split(':');
            return {
                serverId: result.serverId,
                region: args.region,
                variant: args.variantName,
                hostIp: sdrIp,
                hostPort: Number(sdrPort),
                tvIp: result.publicIp,
                tvPort: 27020,
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
        await context.statusUpdater("⏳ [5/7] Waiting for service to stabilize (this can take up to 15 minutes in Buenos Aires)...");
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
            success: true,
            message: 'Server deployed successfully'
        });
    }

    async destroyServer(serverId: string, region: Region): Promise<void> {
        logger.emit({
            severityText: 'INFO',
            body: `Starting server destruction: ${serverId}`,
            attributes: { serverId, region }
        });

        try {
            // Delete ECS service
            await this.ecsServiceManager.delete(serverId, region);

            // Terminate EC2 instance
            await this.ec2InstanceService.terminate(serverId, region);

            // Delete security group
            await this.securityGroupService.delete(serverId, region);

            // Note: Task definition cleanup is handled separately as they can be reused

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

    /**
     * Deletes an existing TF2 server (implements ServerManager interface).
     */
    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        await this.destroyServer(args.serverId, args.region);
    }
}
