import { Region, Server, Variant } from '../../../core/domain';
import { ServerManager } from '../../../core/services/ServerManager';
import { StatusUpdater } from '../../../core/services/StatusUpdater';
import { ConfigManager } from '../../../core/utils/ConfigManager';
import { logger } from '../../../telemetry/otel';
import {
    EC2InstanceService,
    ECSServiceManager,
    EnvironmentVariableBuilder,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService,
    TF2ServerReadinessService
} from './interfaces';
import { DeploymentContext } from './models/DeploymentContext';
import { ServerDeploymentResult } from './models/ServerDeploymentResult';
import { CredentialsService } from './services/CredentialsService';

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
        private readonly environmentVariableBuilder: EnvironmentVariableBuilder,
        private readonly credentialsService: CredentialsService,
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
            extraEnvs: args.extraEnvs || {}
        });

        // Deploy using the internal orchestration logic
        const result = await this.deployServerInternal(context);

        // Convert the result to the expected Server format
        const [sdrIp, sdrPortStr] = result.sdrAddress.split(':');
        const sdrPort = Number(sdrPortStr);

        return {
            serverId: result.serverId,
            region: args.region,
            variant: args.variantName,
            hostIp: sdrIp,
            hostPort: sdrPort,
            rconPassword: result.rconPassword,
            rconAddress: result.publicIp,
            hostPassword: result.serverPassword,
            tvIp: result.publicIp,
            tvPort: 27020, // Standard SourceTV port
            tvPassword: result.tvPassword
        };
    }

    /**
     * Deletes an existing TF2 server.
     */
    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        await this.destroyServer(args.serverId, args.region);
    }

    /**
     * Internal method that orchestrates the deployment of a complete TF2 server
     */
    private async deployServerInternal(context: DeploymentContext, abortSignal?: AbortSignal): Promise<ServerDeploymentResult> {
        logger.emit({
            severityText: 'INFO',
            body: `Starting server deployment: ${context.serverId}`,
            attributes: { serverId: context.serverId, region: context.region }
        });

        const { statusUpdater} = context;
        try {
            // Step 1: Generate credentials
            await statusUpdater('🔐 [1/8] Generating server credentials...');
            const credentials = this.credentialsService.generateCredentials();

            // Step 2: Get variant configuration
            await statusUpdater('⚙️ [2/8] Loading server configuration...');
            const variantConfig = this.configManager.getVariantConfig(context.variantName);
            const awsRegionConfig = this.configManager.getRegionConfig(context.region);

            // Step 3: Create security group
            await statusUpdater('🛡️ [3/8] Creating security group...');
            const securityGroupId = await this.securityGroupService.create(context.serverId, context.region);

            // Step 4: Create EC2 instance
            await statusUpdater('🖥️ [4/8] Creating EC2 instance...');
            const instanceId = await this.ec2InstanceService.create({
                serverId: context.serverId,
                region: context.region,
                variantConfig,
                securityGroupId
            });

            // Step 5: Get public IP
            await statusUpdater('🌐 [5/8] Obtaining public IP address...');
            const publicIp = await this.networkService.getPublicIp(instanceId, context.region);

            // Step 6: Build environment variables and create task definition
            await statusUpdater('📋 [6/8] Creating ECS task definition...');
            const environment = this.environmentVariableBuilder.build(
                context,
                credentials,
                variantConfig,
                awsRegionConfig,
            );

            const taskDefinitionArn = await this.taskDefinitionService.create(
                context,
                credentials,
                environment
            );

            // Step 7: Create ECS service and wait for deployment
            await statusUpdater('🚀 [7/8] Deploying ECS Service and waiting for readiness... (This can take up to 15 minutes for Buenos Aires, please be patient)');
            const serviceArn = await this.ecsServiceManager.create(
                context.serverId,
                context.region,
                taskDefinitionArn
            );

            // Wait for service to be stable
            await this.ecsServiceManager.waitForStable(serviceArn, context.region, abortSignal);

            // Wait for server to be ready
            await statusUpdater('🚀 [8/8] Waiting for the TF2 Server to be ready to receive RCON Commands...'); 
            const sdrAddress = await this.tf2ServerReadinessService.waitForReady(
                publicIp,
                credentials.rconPassword,
                context.serverId,
                abortSignal
            );

            const result = new ServerDeploymentResult({
                serverId: context.serverId,
                publicIp,
                rconPassword: credentials.rconPassword,
                serverPassword: credentials.serverPassword,
                tvPassword: credentials.tvPassword,
                sdrAddress,
                instanceId,
                securityGroupId,
                taskDefinitionArn,
                serviceArn
            });

            logger.emit({
                severityText: 'INFO',
                body: `Server deployment completed successfully: ${context.serverId}`,
                attributes: { 
                    serverId: context.serverId, 
                    region: context.region,
                    publicIp,
                    sdrAddress
                }
            });

            return result;

        } catch (error) {
            logger.emit({
                severityText: 'ERROR',
                body: `Server deployment failed: ${context.serverId}`,
                attributes: { 
                    serverId: context.serverId, 
                    region: context.region,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            
            throw error;
        }
    }

    /**
     * Internal method that destroys a deployed server and all its associated resources
     */
    private async destroyServer(serverId: string, region: Region): Promise<void> {
        logger.emit({
            severityText: 'INFO',
            body: `Starting server destruction: ${serverId}`,
            attributes: { serverId, region }
        });

        try {
            // Clean up in reverse order
            await this.ecsServiceManager.delete(serverId, region);
            await this.ec2InstanceService.terminate(serverId, region);
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
