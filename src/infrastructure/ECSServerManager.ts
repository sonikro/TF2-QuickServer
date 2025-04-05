import { DescribeNetworkInterfacesCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand, DescribeVpcsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { CreateServiceCommand, DeleteServiceCommand, DescribeTasksCommand, ECSClient, ListTasksCommand, RegisterTaskDefinitionCommand, waitUntilServicesStable } from "@aws-sdk/client-ecs";
import { DescribeFileSystemsCommand, EFSClient } from "@aws-sdk/client-efs";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { Chance } from "chance";
import { v4 as uuid } from "uuid";
import { ServerManager } from "../application/services/ServerManager";
import { DeployedServer, getCdkConfig, getRegionConfig, getVariantConfig, Region, Variant } from "../domain";
import { ExecuteCommandCommand } from "@aws-sdk/client-ecs";
import waitUntil from "async-wait-until";
import { DescribeSessionsCommand, GetCommandInvocationCommand, SSMClient } from "@aws-sdk/client-ssm";


export class ECSServerManager implements ServerManager {

    private readonly chance = new Chance();

    async deployServer(args: { region: Region; variantName: Variant; }): Promise<DeployedServer> {
        const { region, variantName } = args;
        const variantConfig = getVariantConfig(variantName);
        const regionConfig = getRegionConfig(region)
        const cdkConfig = getCdkConfig();

        const serverId = uuid()

        const ecsClient = new ECSClient({ region });

        const serverPassword = this.chance.string();
        const rconPassword = this.chance.string();

        // Fetch the EFS File System ID by Name
        const efsClient = new EFSClient({ region });
        // There is no filter for name in the DescribeFileSystemsCommand, so we need to fetch all file systems and filter by name
        const efsResponse = await efsClient.send(new DescribeFileSystemsCommand({}));
        const fileSystem = efsResponse.FileSystems?.find(fs => fs.Name === cdkConfig.efsName);

        const efsId = fileSystem?.FileSystemId;
        if (!efsId) {
            throw new Error(`EFS with name ${cdkConfig.efsName} not found. Did you deploy the CDK stack?`);
        }

        // Get TaskRole ARN from the Name
        const stsClient = new STSClient({ region });
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
                        { name: "STV_PASSWORD", value: process.env.STV_PASSWORD || "" },
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
        const ec2Client = new EC2Client({ region });

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


        // Wait until the Agent is ready to receive commands
        // Run the RCON status command using ECS Exec

        let statusOutput: string[] = [];
        await waitUntil(async () => {
            try {
                const executeCommandResponse = await ecsClient.send(new ExecuteCommandCommand({
                    cluster: cdkConfig.ecsClusterName,
                    container: "tf2-server",
                    command: `/home/tf2/server/rcon -H 0.0.0.0 -p 27015 -P "${rconPassword}" status`,
                    interactive: true,
                    task: taskArn,
                }));

                console.log(JSON.stringify(executeCommandResponse))

                const sessionId = executeCommandResponse.session?.sessionId;
                if (!sessionId) {
                    throw new Error("Failed to start ECS Exec session.");
                }
                const ssmClient = new SSMClient({ region });
                const commandSession = await ssmClient.send(new DescribeSessionsCommand({
                    State: "History",
                    Filters: [
                        {
                            key: "SessionId",
                            value: sessionId,
                        },  
                    ],
                }))
                console.log(JSON.stringify(commandSession))
                const commandInvocation = await ssmClient.send(new GetCommandInvocationCommand({
                    CommandId: commandSession.Sessions?.[0]?.SessionId,
                    InstanceId: commandSession.Sessions?.[0]?.Target,
                }))
                console.log(JSON.stringify(commandInvocation))
                statusOutput.push(commandInvocation.StandardOutputContent!);
                return true;
            } catch (error) {
                console.error("Error executing ECS Exec command:", error);
                return false; // Retry if there's an error
            }
        }, {
            timeout: 60 * 1000, // 60 seconds
            intervalBetweenAttempts: 5 * 1000, // 5 seconds
        })


        // Extract the relevant information from the command output
        const sdrIpRegex = /udp\/ip\s*:\s*([\d.]+:\d+)/;
        const sdrTvRegex = /sourcetv:\s*([\d.]+:\d+)/;

        const srdIpMatch = statusOutput.find(line => sdrIpRegex.test(line));
        const tvIpMatch = statusOutput.find(line => sdrTvRegex.test(line));

        if (!srdIpMatch || !tvIpMatch) {
            throw new Error("Failed to extract server information from command output.");
        }

        const sdrAddress = srdIpMatch.match(sdrIpRegex)?.[1];
        const tvAddress = tvIpMatch.match(sdrTvRegex)?.[1];

        if (!sdrAddress || !tvAddress) {
            throw new Error("Failed to parse server information from command output.");
        }

        const [sdrIp, sdrPort] = sdrAddress.split(":");
        const [tvIp, tvPort] = tvAddress.split(":");

        return {
            serverId: serverId,
            region,
            variant: variantName,
            hostIp: sdrIp,
            hostPort: Number(sdrPort),
            rconPassword,
            rconAddress: publicIp,
            hostPassword: serverPassword,
            tvIp: tvIp,
            tvPort: Number(tvPort),
            tvPassword: process.env.STV_PASSWORD || "",
        };
    }

    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        const { serverId, region } = args;
        const cdkConfig = getCdkConfig();
        const ecsClient = new ECSClient({ region });

        const serviceName = serverId;

        // Delete the service with force flag
        await ecsClient.send(new DeleteServiceCommand({
            cluster: cdkConfig.ecsClusterName,
            service: serviceName,
            force: true,
        }));

    }
}