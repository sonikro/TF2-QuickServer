import { Region } from "../../../../core/domain";
import { DeploymentContext, ServerCredentials } from "../../../../core/models";

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
     * Deletes the ECS task definition for a game server
     */
    delete(serverId: string, region: Region): Promise<void>;
}