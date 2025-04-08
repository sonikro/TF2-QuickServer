import { DescribeNetworkInterfacesCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { CreateServiceCommand, DeleteServiceCommand, DeleteTaskDefinitionsCommand, DeregisterTaskDefinitionCommand, DescribeServicesCommand, DescribeTasksCommand, ListTasksCommand, RegisterTaskDefinitionCommand, waitUntilServicesStable } from "@aws-sdk/client-ecs";
import { DescribeFileSystemsCommand } from "@aws-sdk/client-efs";
import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { v4 as uuid } from "uuid";
import { Region, Server, Variant } from "../../core/domain";
import { ServerStatus } from "../../core/domain/ServerStatus";
import { AWSServiceFactory } from "../../core/services/AWSServiceFactory";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";
import { waitUntil } from "../utils/waitUntil";


export class ECSServerManager implements ServerManager {

    constructor(private readonly dependencies: {
        serverCommander: ServerCommander;
        awsServiceFactory: AWSServiceFactory,
        configManager: ConfigManager;
        passwordGenerator: PasswordGenerator
    }) { }

    async deployServer(args: { region: Region; variantName: Variant; sourcemodAdminSteamId?: string }): Promise<Server> {
        const { awsServiceFactory, serverCommander, configManager, passwordGenerator } = this.dependencies;
        const { region, variantName, sourcemodAdminSteamId } = args;
        const { ecsClient, efsClient, ec2Client, stsClient } = awsServiceFactory({ region });
        const variantConfig = configManager.getVariantConfig(variantName);
        const regionConfig = configManager.getRegionConfig(region)
        const cdkConfig = configManager.getCdkConfig();

        const serverId = uuid()

        const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false }
        const serverPassword = passwordGenerator(passwordSettings);
        const rconPassword = passwordGenerator(passwordSettings);
        const tvPassword = passwordGenerator(passwordSettings);
        // Fetch the EFS File System ID by Name
        // There is no filter for name in the DescribeFileSystemsCommand, so we need to fetch all file systems and filter by name
        const efsResponse = await efsClient.send(new DescribeFileSystemsCommand({}));
        const fileSystem = efsResponse.FileSystems?.find(fs => fs.Name === cdkConfig.efsName);

        const efsId = fileSystem?.FileSystemId;
        if (!efsId) {
            throw new Error(`EFS with name ${cdkConfig.efsName} not found. Did you deploy the CDK stack?`);
        }

        // Get TaskRole ARN from the Name
        // Get the account ID
        const identity = await stsClient.send(new GetCallerIdentityCommand());
        const taskExecutionRoleArn = `arn:aws:iam::${identity.Account}:role/${cdkConfig.ecsTaskExecutionRoleName}-${region}`;
        const taskRoleArn = `arn:aws:iam::${identity.Account}:role/${cdkConfig.ecsTaskRoleName}-${region}`;

        // Register Task Definition
        const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
            family: serverId,
            networkMode: "awsvpc",
            requiresCompatibilities: ["FARGATE"],
            cpu: variantConfig.cpu.toString(),
            memory: variantConfig.memory.toString(),
            executionRoleArn: taskExecutionRoleArn,
            taskRoleArn: taskRoleArn,
            containerDefinitions: [
                {
                    name: "tf2-server",
                    image: variantConfig.image,
                    memory: variantConfig.memory,
                    cpu: variantConfig.cpu,
                    essential: true,
                    environment: [
                        { name: "SERVER_HOSTNAME", value: regionConfig.srcdsHostname },
                        { name: "SERVER_PASSWORD", value: serverPassword },
                        { name: "DEMOS_TF_APIKEY", value: process.env.DEMOS_TF_APIKEY || "" },
                        { name: "LOGS_TF_APIKEY", value: process.env.LOGS_TF_APIKEY || "" },
                        { name: "RCON_PASSWORD", value: rconPassword },
                        { name: "STV_NAME", value: regionConfig.tvHostname },
                        { name: "STV_PASSWORD", value: tvPassword },
                        { name: "ADMIN_STEAM_ID", value: sourcemodAdminSteamId || "" },
                        ...(variantConfig.defaultCfgs ? Object.entries(variantConfig.defaultCfgs).map(([key, value]) => ({
                            name: `DEFAULT_${key.toUpperCase()}_CFG`,
                            value: value,
                        })) : []),
                    ],
                    command: [
                        "-enablefakeip",
                        "+sv_pure",
                        variantConfig.svPure.toString(),
                        "+maxplayers",
                        variantConfig.maxPlayers.toString(),
                        "+map",
                        variantConfig.map,
                    ],
                    mountPoints: [
                        {
                            sourceVolume: "tf2-maps",
                            containerPath: "/home/tf2/server/tf/maps",
                            readOnly: true,
                        },
                    ],
                },
            ],
            volumes: [
                {
                    name: "tf2-maps",
                    efsVolumeConfiguration: {
                        fileSystemId: efsId, // Use the dynamically fetched EFS ID
                        transitEncryption: "ENABLED",
                        rootDirectory: "maps",
                    },
                },
            ],
        }));

        const taskDefinitionArn = taskDefinitionResponse.taskDefinition?.taskDefinitionArn!;

        // Reads the VPC and Subnets from the vpcName

        const vpcResponse = await ec2Client.send(new DescribeVpcsCommand({
            Filters: [
                { Name: "tag:Name", Values: [cdkConfig.vpcName] },
            ],
        }));

        const vpcId = vpcResponse.Vpcs?.[0]?.VpcId;
        if (!vpcId) {
            throw new Error(`VPC with name ${cdkConfig.vpcName} not found. Did you deploy the CDK stack?`);
        }

        const subnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({
            Filters: [
                { Name: "vpc-id", Values: [vpcId] },
            ],
        }));

        const subnets = subnetsResponse.Subnets?.map(subnet => subnet.SubnetId!);
        if (!subnets || subnets.length === 0) {
            throw new Error(`No subnets found for VPC with ID ${vpcId}. Did you deploy the CDK stack?`);
        }

        // Get Security Groups
        const securityGroupsResponse = await ec2Client.send(new DescribeSecurityGroupsCommand({
            Filters: [
                { Name: "vpc-id", Values: [vpcId] },
                { Name: "group-name", Values: [cdkConfig.sgName] },
            ],
        }));

        const securityGroupId = securityGroupsResponse.SecurityGroups?.[0]?.GroupId;
        if (!securityGroupId) {
            throw new Error(`Security group with name ${cdkConfig.sgName} not found. Did you deploy the CDK stack?`);
        }

        // Create ECS Service
        const serviceResponse = await ecsClient.send(new CreateServiceCommand({
            cluster: cdkConfig.ecsClusterName,
            serviceName: serverId,
            taskDefinition: taskDefinitionArn,
            desiredCount: 1,
            launchType: "FARGATE",
            enableExecuteCommand: true,
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets,
                    securityGroups: [securityGroupId],
                    assignPublicIp: "ENABLED",
                },
            },
        }));

        const serviceArn = serviceResponse.service?.serviceArn!;

        console.log(`Service created: ${serviceArn}. Waiting for it to be stable...`);

        // Wait for the service to be healthy
        await waitUntilServicesStable({
            client: ecsClient,
            maxWaitTime: 300,
            maxDelay: 15,
            minDelay: 15
        }, {
            cluster: cdkConfig.ecsClusterName,
            services: [serviceArn]
        },);


        console.log(`Service is stable: ${serviceArn}.`);

        // List tasks associated with the service
        const listTasksResponse = await ecsClient.send(
            new ListTasksCommand({
                cluster: cdkConfig.ecsClusterName,
                serviceName: serverId
            })
        );

        const taskArn = listTasksResponse.taskArns?.[0]!

        // Get the public IP of the task
        const taskResponse = await ecsClient.send(new DescribeTasksCommand({
            cluster: cdkConfig.ecsClusterName,
            tasks: [taskArn],
        }));
        const task = taskResponse.tasks?.[0]!;
        const eniId = task.attachments?.[0]?.details?.find(detail => detail.name === "networkInterfaceId")?.value!;
        const networkInterfaceResponse = await ec2Client.send(new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: [eniId],
        }));
        const networkInterface = networkInterfaceResponse.NetworkInterfaces?.[0]!;
        const publicIp = networkInterface.Association?.PublicIp!;
        const privateIp = networkInterface.PrivateIpAddress!;


        // Wait until the Agent is ready to receive commands
        // Run the RCON status command using ECS Exec
        console.log(`Waiting for the server to be ready...`);
        const { sdrAddress } = await waitUntil<{ sdrAddress: string }>(async () => {
            const result = await serverCommander.query({
                command: "status",
                host: publicIp,
                password: rconPassword,
                port: 27015,
                timeout: 5000,
            })

            const serverStatus = new ServerStatus(result);

            if (!serverStatus.sourceTVIp) {
                throw new Error("Server is not ready yet");
            }
            return {
                sdrAddress: `${serverStatus.serverIp}:${serverStatus.serverPort}`,
            }
        }, {
            timeout: 120000, // 120 seconds
            interval: 5000, // 5 seconds
        });

        const [sdrIp, sdrPort] = sdrAddress.split(":");

        console.log(`Server ${serverId} is ready.`);

        return {
            serverId: serverId,
            region,
            variant: variantName,
            hostIp: sdrIp,
            hostPort: Number(sdrPort),
            rconPassword,
            rconAddress: publicIp,
            hostPassword: serverPassword,
            tvIp: publicIp,
            tvPort: 27020,
            tvPassword,
        };
    }

    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        const { awsServiceFactory, configManager } = this.dependencies;
        const { serverId, region } = args;
        const cdkConfig = configManager.getCdkConfig();
        const { ecsClient } = awsServiceFactory({ region });

        const serviceName = serverId;

        // Describe the service to get the task definition
        const describeServiceResponse = await ecsClient.send(new DescribeServicesCommand({
            cluster: cdkConfig.ecsClusterName,
            services: [serviceName],
        }));

        const taskDefinitionArn = describeServiceResponse.services?.[0]?.taskDefinition;
        if (!taskDefinitionArn) {
            throw new Error(`Task definition not found for service ${serviceName}`);
        }

        // Delete the service with force flag
        await ecsClient.send(new DeleteServiceCommand({
            cluster: cdkConfig.ecsClusterName,
            service: serviceName,
            force: true,
        }));

        // Deregister the task definition
        await ecsClient.send(new DeregisterTaskDefinitionCommand({
            taskDefinition: taskDefinitionArn,
        }));

        // Delete the Task Definition
        await ecsClient.send(new DeleteTaskDefinitionsCommand({
            taskDefinitions: [taskDefinitionArn],
        }))
    }
}