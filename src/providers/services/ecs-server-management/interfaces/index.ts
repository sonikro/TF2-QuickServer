import { Region, VariantConfig, RegionConfig } from "../../../../core/domain";
import { DeploymentContext } from "../models/DeploymentContext";
import { ServerCredentials } from "../models/ServerCredentials";

export interface TaskDefinitionService {
    /**
     * Creates and registers an ECS task definition for a game server
     */
    create(
        context: DeploymentContext,
        credentials: ServerCredentials,
        environment: Record<string, string>
    ): Promise<string>;

    /**
     * Deregisters a task definition
     */
    delete(taskDefinitionArn: string, region: Region): Promise<void>;
}

export interface SecurityGroupService {
    /**
     * Creates a security group for the TF2 server with necessary rules
     */
    create(serverId: string, region: Region): Promise<string>;

    /**
     * Deletes the security group for the TF2 server
     */
    delete(serverId: string, region: Region): Promise<void>;
}

export interface EC2InstanceService {
    /**
     * Creates a dedicated EC2 instance for the game server
     */
    create(args: {
        serverId: string;
        region: Region;
        variantConfig: VariantConfig;
        securityGroupId: string;
    }): Promise<string>;

    /**
     * Terminates the dedicated EC2 instance for the game server
     */
    terminate(serverId: string, region: Region): Promise<void>;
}

export interface ECSServiceManager {
    /**
     * Creates an ECS service for the game server
     */
    create(
        serverId: string,
        region: Region,
        taskDefinitionArn: string
    ): Promise<string>;

    /**
     * Waits for the ECS service to be stable
     */
    waitForStable(
        serviceArn: string,
        region: Region,
        abortSignal?: AbortSignal
    ): Promise<void>;

    /**
     * Deletes an ECS service
     */
    delete(serverId: string, region: Region): Promise<void>;
}

export interface NetworkService {
    /**
     * Retrieves the public IP address from an EC2 instance
     */
    getPublicIp(instanceId: string, region: Region): Promise<string>;
}

export interface TF2ServerReadinessService {
    /**
     * Waits for the TF2 server to be ready and returns SDR address
     */
    waitForReady(
        publicIp: string,
        rconPassword: string,
        serverId: string,
        abortSignal?: AbortSignal
    ): Promise<string>;
}

export interface EnvironmentVariableBuilder {
    /**
     * Builds environment variables for the container
     */
    build(
        context: DeploymentContext,
        credentials: ServerCredentials,
        variantConfig: VariantConfig,
        regionConfig: RegionConfig,
    ): Record<string, string>;
}
