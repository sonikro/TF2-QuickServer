import { Region } from "@tf2qs/core/src/domain";

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
