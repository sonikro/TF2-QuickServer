import { PasswordGeneratorService } from "../../../core/services/PasswordGeneratorService";
import { ServerCommander } from "../../../core/services/ServerCommander";
import { ConfigManager } from "../../../core/utils/ConfigManager";
import { AWSClientFactory } from "../../services/defaultAWSServiceFactory";
import { DefaultEnvironmentBuilderService } from "../../services/DefaultEnvironmentBuilderService";
import { DefaultTF2ServerReadinessService } from "../../services/DefaultTF2ServerReadinessService";
import { ECSServerManager } from "./ECSServerManager";
import { DefaultEC2InstanceService } from "./services/EC2InstanceService";
import { DefaultECSServiceManager } from "./services/ECSServiceManager";
import { DefaultNetworkService } from "./services/NetworkService";
import { DefaultSecurityGroupService } from "./services/SecurityGroupService";
import { DefaultTaskDefinitionService } from "./services/TaskDefinitionService";

export interface ECSServerManagerDependencies {
    configManager: ConfigManager;
    awsClientFactory: AWSClientFactory;
    serverCommander: ServerCommander;
    passwordGeneratorService: PasswordGeneratorService;
}

export class ECSServerManagerFactory {
    static createServerManager(dependencies: ECSServerManagerDependencies): ECSServerManager {
        const { configManager, awsClientFactory, serverCommander, passwordGeneratorService } = dependencies;
        
        // Create AWS services - they take configManager and awsClientFactory
        const taskDefinitionService = new DefaultTaskDefinitionService(configManager, awsClientFactory);
        const ecsServiceManager = new DefaultECSServiceManager(configManager, awsClientFactory);
        const securityGroupService = new DefaultSecurityGroupService(configManager, awsClientFactory);
        const networkService = new DefaultNetworkService(configManager, awsClientFactory);
        const ec2InstanceService = new DefaultEC2InstanceService(configManager, awsClientFactory);
        
        // Create core services
        const environmentBuilderService = new DefaultEnvironmentBuilderService();
        const tf2ServerReadinessService = new DefaultTF2ServerReadinessService(serverCommander);
        
        return new ECSServerManager(
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
}
