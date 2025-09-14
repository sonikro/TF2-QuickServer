import { ServerCommander } from '../../../core/services/ServerCommander';
import { ServerManager } from '../../../core/services/ServerManager';
import { ConfigManager } from '../../../core/utils/ConfigManager';
import { AWSClientFactory } from '../defaultAWSServiceFactory';
import { ECSServerManager } from './ECSServerManager';
import {
    EC2InstanceService,
    ECSServiceManager,
    EnvironmentVariableBuilder,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService,
    TF2ServerReadinessService
} from './interfaces';
import { DefaultCredentialsService } from './services/CredentialsService';
import { DefaultEC2InstanceService } from './services/EC2InstanceService';
import { DefaultECSServiceManager } from './services/ECSServiceManager';
import { DefaultEnvironmentVariableBuilder } from './services/EnvironmentBuilderService';
import { DefaultNetworkService } from './services/NetworkService';
import { PasswordGeneratorService } from './services/PasswordGeneratorService';
import { DefaultSecurityGroupService } from './services/SecurityGroupService';
import { DefaultTaskDefinitionService } from './services/TaskDefinitionService';
import { DefaultTF2ServerReadinessService } from './services/TF2ServerReadinessService';

/**
 * Factory for creating a fully configured ECSServerManager with all dependencies
 */
export class ECSServerManagerFactory {
    
    /**
     * Creates an ECSServerManager with all dependencies wired together
     */
    static create(dependencies: {
        configManager: ConfigManager;
        awsClientFactory: AWSClientFactory;
        serverCommander: ServerCommander;
        passwordGeneratorService: PasswordGeneratorService;
        chance: Chance.Chance;
    }): ECSServerManager {
        
        // Create individual services
        const taskDefinitionService: TaskDefinitionService = new DefaultTaskDefinitionService(
            dependencies.configManager,
            dependencies.awsClientFactory
        );

        const securityGroupService: SecurityGroupService = new DefaultSecurityGroupService(
            dependencies.configManager,
            dependencies.awsClientFactory
        );

        const ec2InstanceService: EC2InstanceService = new DefaultEC2InstanceService(
            dependencies.configManager,
            dependencies.awsClientFactory
        );

        const ecsServiceManager: ECSServiceManager = new DefaultECSServiceManager(
            dependencies.configManager,
            dependencies.awsClientFactory
        );

        const networkService: NetworkService = new DefaultNetworkService(
            dependencies.configManager,
            dependencies.awsClientFactory
        );

        const tf2ServerReadinessService: TF2ServerReadinessService = new DefaultTF2ServerReadinessService(
            dependencies.serverCommander
        );

        const credentialsService = new DefaultCredentialsService(
            dependencies.passwordGeneratorService,
            dependencies.chance
        );

        const environmentVariableBuilder: EnvironmentVariableBuilder = new DefaultEnvironmentVariableBuilder();

        // Create and return the ECS server manager
        return new ECSServerManager(
            taskDefinitionService,
            securityGroupService,
            ec2InstanceService,
            ecsServiceManager,
            networkService,
            tf2ServerReadinessService,
            environmentVariableBuilder,
            credentialsService,
            dependencies.configManager,
        );
    }

    /**
     * Creates a ServerManager using the ECS architecture
     */
    static createServerManager(dependencies: {
        configManager: ConfigManager;
        awsClientFactory: AWSClientFactory;
        serverCommander: ServerCommander;
        passwordGeneratorService: PasswordGeneratorService;
        chance: Chance.Chance;
    }): ServerManager {
        return ECSServerManagerFactory.create(dependencies);
    }
}
