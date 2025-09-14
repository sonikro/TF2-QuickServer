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
     * Deregisters a task definition
     */
    delete(taskDefinitionArn: string, region: Region): Promise<void>;
}