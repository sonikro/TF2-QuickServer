import { DeploymentContext } from "../../../../core/models";

export interface ContainerInstanceService {
    create(params: {
        context: DeploymentContext;
        environment: Record<string, string>;
        variantConfig: any;
        nsgId: string;
    }): Promise<string>;
    
    waitForActive(params: { containerId: string; signal: AbortSignal }): Promise<void>;
    
    delete(params: { serverId: string; region: string }): Promise<void>;
}
