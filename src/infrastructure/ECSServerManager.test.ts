import { DescribeNetworkInterfacesCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand, DescribeVpcsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { CreateServiceCommand, DeleteServiceCommand, DescribeServicesCommand, DescribeTasksCommand, ECSClient, ListTasksCommand, RegisterTaskDefinitionCommand } from "@aws-sdk/client-ecs";
import { mockClient } from 'aws-sdk-client-mock';
import {
    allCustomMatcher,
    CustomMatcher
} from "aws-sdk-client-mock-vitest";
import { Chance } from "chance";
import { v4 } from "uuid";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { when } from "vitest-when";
import { CdkConfig, DeployedServer, getCdkConfig, getRegionConfig, getVariantConfig, Region, RegionConfig, Variant, VariantConfig } from "../domain";
import { ECSServerManager } from "./ECSServerManager";

expect.extend(allCustomMatcher)

declare module "vitest" {
    interface Assertion<T = any> extends CustomMatcher<T> { }
    interface AsymmetricMatchersContaining extends CustomMatcher { }
}

vi.mock("../domain", async (importOriginal) => {
    const actual = await importOriginal() as typeof import('../domain');
    return {
        ...actual,
        getRegionConfig: vi.fn(),
        getVariantConfig: vi.fn(),
        getCdkConfig: vi.fn()
    }
})

vi.mock("uuid", async (importOriginal) => {
    const actual = await importOriginal() as typeof import('uuid');
    return {
        ...actual,
        v4: vi.fn()
    }
})

describe("ECSServerManager", () => {
    const chance = new Chance();

    const createTestEnvironment = () => {
        const ecsMock = mockClient(ECSClient);
        const ec2Mock = mockClient(EC2Client);
        const region = chance.pickone(Object.values(Region))
        const variantName = chance.pickone(Object.values(Variant))
        const taskDefinitionArn = chance.string();
        const serverId = chance.guid();
        const vpcId = chance.string();
        const subnetIds = chance.n(chance.string, 2);
        const sgId = chance.string();
        const serviceArn = chance.string();
        const taskArn = chance.string();
        const eniId = chance.string();
        const publicIp = chance.ip();
        const variantConfig: VariantConfig = {
            cpu: chance.integer({ min: 256, max: 2048 }),
            memory: chance.integer({ min: 512, max: 4096 }),
            image: chance.string(),
            svPure: chance.integer({ min: 0, max: 2 }),
            map: chance.string(),
            maxPlayers: chance.integer({ min: 1, max: 32 }),
            serverName: chance.string(),
        }

        const regionConfig: RegionConfig = {
            enabled: true,
            srcdsHostname: chance.string(),
            tvHostname: chance.string(),
        }

        const cdkConfig: CdkConfig = {
            ecsClusterName: chance.string(),
            sgName: chance.string(),
            vpcName: chance.string()
        }

        process.env.DEMOS_TF_APIKEY = chance.string();
        process.env.LOGS_TF_APIKEY = chance.string();
        process.env.STV_PASSWORD = chance.string();

        ecsMock.on(RegisterTaskDefinitionCommand).resolves({
            taskDefinition: { taskDefinitionArn: taskDefinitionArn },
        });

        ec2Mock.on(DescribeVpcsCommand, {
            Filters: [
                { Name: "tag:Name", Values: [cdkConfig.vpcName] }
            ]
        }).resolves({
            Vpcs: [
                {
                    VpcId: vpcId
                },
            ],
        })

        ec2Mock.on(DescribeSubnetsCommand, {
            Filters: [
                { Name: "vpc-id", Values: [vpcId] }
            ]
        }).resolves({
            Subnets: subnetIds.map(subnetId => ({
                SubnetId: subnetId,
                VpcId: vpcId
            }))
        })

        ec2Mock.on(DescribeSecurityGroupsCommand, {
            Filters: [
                { Name: "vpc-id", Values: [vpcId] },
                { Name: "group-name", Values: [cdkConfig.sgName] }
            ]
        }).resolves({
            SecurityGroups: [
                {
                    GroupId: sgId
                }
            ]
        })

        ecsMock.on(CreateServiceCommand).resolves({
            service: {
                serviceArn
            }
        })

        // Mocks the command used by the waitUntilServicesTable, by returning ACTIVE
        ecsMock.on(DescribeServicesCommand).resolves({
            services: [
                {
                    serviceName: 'example-service',
                    status: 'ACTIVE',
                    deployments: [
                        {
                            status: 'PRIMARY',
                            runningCount: 1,
                            desiredCount: 1,
                        },
                    ],
                },
            ],
        });



        ecsMock.on(ListTasksCommand, {
            cluster: cdkConfig.ecsClusterName,
            serviceName: serverId,
        }).resolves({
            taskArns: [taskArn]
        })

        ecsMock.on(DescribeTasksCommand, {
            cluster: cdkConfig.ecsClusterName,
            tasks: [taskArn]
        }).resolves({
            tasks: [
                {
                    taskArn,
                    attachments: [
                        {
                            details: [
                                {
                                    name: "networkInterfaceId",
                                    value: eniId
                                }
                            ]
                        }
                    ]
                }
            ]
        })

        ec2Mock.on(DescribeNetworkInterfacesCommand, {
            NetworkInterfaceIds: [eniId]
        }).resolves({
            NetworkInterfaces: [
                {
                    Association: {
                        PublicIp: publicIp
                    }
                }
            ]
        })

        when(getVariantConfig).calledWith(variantName).thenReturn(variantConfig);
        when(getRegionConfig).calledWith(region).thenReturn(regionConfig);
        when(getCdkConfig).calledWith().thenReturn(cdkConfig);
        vi.mocked(v4).mockReturnValue(serverId as any);

        return {
            ecsMock,
            ec2Mock,
            region,
            variantName,
            taskDefinitionArn,
            serverId,
            vpcId,
            subnetIds,
            sgId,
            serviceArn,
            taskArn,
            eniId,
            publicIp,
            variantConfig,
            regionConfig,
            cdkConfig
        }
    }

    describe("deployServer", () => {

        const {
            ecsMock,
            region,
            variantName,
            taskDefinitionArn,
            serverId,
            subnetIds,
            sgId,
            publicIp,
            variantConfig,
            regionConfig,
            cdkConfig
        } = createTestEnvironment();

        let deployedServer: DeployedServer;
        beforeAll(async () => {
            const ecsServerManager = new ECSServerManager();


            deployedServer = await ecsServerManager.deployServer({
                region,
                variantName,
            });
        })

        it("should create a task definition based on the variant config", () => {
            expect(ecsMock).toHaveReceivedCommandWith(RegisterTaskDefinitionCommand, {
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
                        environment: expect.arrayContaining([
                            { name: "SERVER_HOSTNAME", value: regionConfig.srcdsHostname },
                            { name: "SERVER_PASSWORD", value: expect.any(String) },
                            { name: "DEMOS_TF_APIKEY", value: process.env.DEMOS_TF_APIKEY },
                            { name: "LOGS_TF_APIKEY", value: process.env.LOGS_TF_APIKEY },
                            { name: "RCON_PASSWORD", value: expect.any(String) },
                            { name: "STV_NAME", value: regionConfig.tvHostname },
                            { name: "STV_PASSWORD", value: process.env.STV_PASSWORD },
                        ]),
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
            });

        })

        it("should create a ECS Service with the correct settings", () => {
            expect(ecsMock).toHaveReceivedCommandWith(CreateServiceCommand, {
                cluster: cdkConfig.ecsClusterName,
                desiredCount: 1,
                launchType: "FARGATE",
                networkConfiguration: {
                    awsvpcConfiguration: {
                        assignPublicIp: "ENABLED",
                        securityGroups: [sgId],
                        subnets: subnetIds,
                    },
                },
                serviceName: serverId,
                taskDefinition: taskDefinitionArn,
            });
        })

        it("should return a DeployedServer object with the correct properties", () => {
            expect(deployedServer).toEqual({
                hostIp: publicIp,
                serverId,
                hostPort: 27015,
                rconPassword: expect.any(String),
                region,
                tvIp: publicIp,
                tvPort: 27020,
                variant: variantName,
                hostPassword: expect.any(String),
                tvPassword: process.env.STV_PASSWORD,
            } as DeployedServer);
        })
    })

    describe("deleteServer", () => {


        it("should force terminate the service", async () => {
            const {
                ecsMock,
                region,
                variantName,
                serverId,
                cdkConfig
            } = createTestEnvironment();
            const ecsServerManager = new ECSServerManager();

            await ecsServerManager.deleteServer({
                serverId,
                region
            })

            expect(ecsMock).toHaveReceivedCommandWith(DeleteServiceCommand, {
                cluster: cdkConfig.ecsClusterName,
                service: serverId,
                force: true
            })
        })
    })

})