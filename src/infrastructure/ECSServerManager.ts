import { DescribeNetworkInterfacesCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand, DescribeVpcsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { CreateServiceCommand, DeleteServiceCommand, DescribeServicesCommand, DescribeTasksCommand, ECSClient, ListTasksCommand, RegisterTaskDefinitionCommand, UpdateServiceCommand, waitUntilServicesStable } from "@aws-sdk/client-ecs";
import { Chance } from "chance";
import { v4 as uuid } from "uuid";
import { ServerManager } from "../application/services/ServerManager";
import { DeployedServer, getRegionConfig, getVariantConfig, Region, Variant, getCdkConfig } from "../domain";

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

        // Register Task Definition
        const taskDefinitionResponse = await ecsClient.send(new RegisterTaskDefinitionCommand({
            family: serverId,
            networkMode: "awsvpc",
            requiresCompatibilities: ["FARGATE"],
            cpu: variantConfig.cpu.toString(),
            memory: variantConfig.memory.toString(),
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

        // Gets the TaskArn from the Service

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

        return {
            serverId: serverId,
            region,
            variant: variantName,
            hostIp: publicIp,
            hostPort: 27015,
            rconPassword,
            hostPassword: serverPassword,
            tvIp: publicIp,
            tvPort: 27020,
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