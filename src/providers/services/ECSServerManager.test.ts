import { DescribeNetworkInterfacesCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand, DescribeVpcsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { CreateServiceCommand, CreateServiceCommandInput, DeleteServiceCommand, DeleteTaskDefinitionsCommand, DeregisterTaskDefinitionCommand, DescribeServicesCommand, DescribeTasksCommand, ECSClient, ListTasksCommand, RegisterTaskDefinitionCommand, RegisterTaskDefinitionCommandInput } from "@aws-sdk/client-ecs";
import { DescribeFileSystemsCommand, EFSClient, FileSystemDescription } from "@aws-sdk/client-efs";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { mockClient } from 'aws-sdk-client-mock';
import {
    allCustomMatcher,
    CustomMatcher
} from "aws-sdk-client-mock-vitest";
import { Chance } from "chance";
import { v4 } from "uuid";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CdkConfig, Region, RegionConfig, Server, Variant, VariantConfig } from "../../core/domain";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { ECSServerManager } from "./ECSServerManager";

expect.extend(allCustomMatcher)

declare module "vitest" {
    interface Assertion<T = any> extends CustomMatcher<T> { }
    interface AsymmetricMatchersContaining extends CustomMatcher { }
}

vi.mock("uuid", async (importOriginal) => {
    const actual = await importOriginal() as typeof import('uuid');
    return {
        ...actual,
        v4: vi.fn()
    }
})

const chance = new Chance();

const createTestEnvironment = () => {
    const ecsClient = new ECSClient({});
    const ec2Client = new EC2Client({});
    const efsClient = new EFSClient({});
    const stsClient = new STSClient({});
    const ecsMock = mockClient(ecsClient);
    const ec2Mock = mockClient(ec2Client);
    const efsMock = mockClient(efsClient);
    const stsMock = mockClient(stsClient);

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
    const adminSteamId = chance.string();
    const variantConfig: VariantConfig = {
        cpu: chance.integer({ min: 256, max: 2048 }),
        memory: chance.integer({ min: 512, max: 4096 }),
        image: chance.string(),
        svPure: chance.integer({ min: 0, max: 2 }),
        map: chance.string(),
        maxPlayers: chance.integer({ min: 1, max: 32 }),
        serverName: chance.string(),
        defaultCfgs: {
            "5cp": chance.string(),
            "koth": chance.string(),
            "pl": chance.string(),
            "ultiduo": chance.string()
        }
    }

    const regionConfig: RegionConfig = {
        enabled: true,
        srcdsHostname: chance.string(),
        tvHostname: chance.string(),
    }

    const cdkConfig: CdkConfig = {
        ecsClusterName: chance.string(),
        sgName: chance.string(),
        vpcName: chance.string(),
        ecsTaskExecutionRoleName: chance.string(),
        efsName: chance.string(),
        ecsTaskRoleName: chance.string()
    }

    const serverCommander = mock<ServerCommander>();

    process.env.DEMOS_TF_APIKEY = chance.string();
    process.env.LOGS_TF_APIKEY = chance.string();

    const efsSystem: FileSystemDescription = {
        CreationTime: chance.date(),
        FileSystemId: chance.string(),
        Name: cdkConfig.efsName,
        OwnerId: chance.string(),
        SizeInBytes: { Value: 0 },
        CreationToken: chance.string(),
        LifeCycleState: "available",
        NumberOfMountTargets: 0,
        PerformanceMode: "generalPurpose",
        Tags: [],
    }

    const accountId = chance.string();
    const privateIP = chance.ip();
    const sdrIp = chance.ip();
    const tvIp = chance.ip();
    const sdrPort = chance.integer({ min: 27000, max: 28000 });
    const tvPort = chance.integer({ min: 27000, max: 28000 });

    const configManager: ConfigManager = {
        getCdkConfig: vi.fn(),
        getRegionConfig: vi.fn(),
        getVariantConfig: vi.fn()
    }

    const passwordGenerator = vi.fn().mockImplementation(args => chance.string(args))

    return {
        awsClients: {
            ecsMock,
            ec2Mock,
            efsMock,
            stsMock,
        },
        mocks: {
            serverCommander,
            configManager,
            passwordGenerator
        },
        values: {
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
            cdkConfig,
            efsSystem,
            accountId,
            sdrIp,
            sdrPort,
            tvIp,
            tvPort,
            privateIP,
            adminSteamId
        },
        sut: new ECSServerManager({
            serverCommander,
            awsServiceFactory: () => ({
                ecsClient: ecsMock as unknown as ECSClient,
                ec2Client: ec2Mock as unknown as EC2Client,
                efsClient: efsMock as unknown as EFSClient,
                stsClient: stsMock as unknown as STSClient,
            }),
            configManager,
            passwordGenerator,
        })
    }
}

const givenTheExpectedMockResults = (testEnvironment: ReturnType<typeof createTestEnvironment>) => {
    const {
        awsClients: { ec2Mock, efsMock, ecsMock, stsMock },
        values: {
            serverId,
            region,
            variantName,
            taskDefinitionArn,
            vpcId,
            subnetIds,
            sgId,
            serviceArn,
            taskArn,
            eniId,
            publicIp,
            variantConfig,
            regionConfig,
            cdkConfig,
            efsSystem,
            accountId,
            sdrIp,
            sdrPort,
            tvIp,
            tvPort,
            privateIP
        },
        mocks: { serverCommander, configManager }
    } = testEnvironment;

    when(configManager.getVariantConfig).calledWith(variantName).thenReturn(variantConfig);
    when(configManager.getRegionConfig).calledWith(region).thenReturn(regionConfig);
    when(configManager.getCdkConfig).calledWith().thenReturn(cdkConfig);

    efsMock.on(DescribeFileSystemsCommand).resolves({
        FileSystems: [
            efsSystem
        ]
    })

    stsMock.on(GetCallerIdentityCommand).resolves({
        Account: accountId,
    })
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
                taskDefinition: taskDefinitionArn,
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
                },
                PrivateIpAddress: privateIP
            }
        ]
    })

    vi.mocked(v4).mockReturnValue(serverId as any);

    when(serverCommander.query).calledWith({
        command: "status",
        host: publicIp,
        password: expect.any(String),
        port: 27015,
        timeout: 5000,
    }).thenResolve(`"hostname: TF2-QuickServer | Virginia @ Sonikro Solutions\r
version : 9543365/24 9543365 secure\r
udp/ip  : ${sdrIp}:${sdrPort}  (local: 0.0.0.0:27015)  (public IP from Steam: 52.70.193.105)\r
steamid : [A:1:3216499730:44777] (90264311514522642)\r
account : not logged in  (No account specified)\r
map     : cp_badlands at: 0 x, 0 y, 0 z\r
tags    : cp,increased_maxplayers\r
players : 0 humans, 0 bots (25 max)\r
edicts  : 416 used of 2048 max\r
sourcetv: ${tvIp}:${tvPort}\r
# userid name                uniqueid            connected ping loss state  adr\r
"`)
}

describe("ECSServerManager", () => {

    describe("deployServer", () => {
        const testEnvironment = createTestEnvironment();
        const {
            values: {
                serverId,
                region,
                variantName,
                taskDefinitionArn,
                subnetIds,
                sgId,
                publicIp,
                variantConfig,
                cdkConfig,
                efsSystem,
                accountId,
                sdrIp,
                sdrPort,
                tvIp,
                tvPort,
                regionConfig
            }
        } = testEnvironment
        describe("happy path", () => {

            let deployedServer: Server;
            let registerTaskDefinitionCommandInput: RegisterTaskDefinitionCommandInput
            let createServiceCommandInput: CreateServiceCommandInput

            beforeAll(async () => {
                givenTheExpectedMockResults(testEnvironment);
                deployedServer = await testEnvironment.sut.deployServer({
                    region: testEnvironment.values.region,
                    variantName: testEnvironment.values.variantName,
                    sourcemodAdminSteamId: testEnvironment.values.adminSteamId
                });
                registerTaskDefinitionCommandInput = testEnvironment.awsClients.ecsMock.commandCall(0, RegisterTaskDefinitionCommand).args[0].input
                createServiceCommandInput = testEnvironment.awsClients.ecsMock.commandCall(0, CreateServiceCommand).args[0].input
            })

            describe("Task Definition", () => {

                it("should create an ECS Fargate task definition", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        family: serverId,
                        networkMode: "awsvpc",
                        requiresCompatibilities: ["FARGATE"],
                    }));
                });

                it("should use the correct execution role ARN", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        executionRoleArn: `arn:aws:iam::${accountId}:role/${cdkConfig.ecsTaskExecutionRoleName}-${region}`,
                    }));
                });

                it("should use the correct task role ARN", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        taskRoleArn: `arn:aws:iam::${accountId}:role/${cdkConfig.ecsTaskRoleName}-${region}`,
                    }));
                })

                it("should set the correct CPU and memory", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        cpu: variantConfig.cpu.toString(),
                        memory: variantConfig.memory.toString(),
                    }));
                });

                it("should contain the correct container definition properties", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        containerDefinitions: expect.arrayContaining([
                            expect.objectContaining({
                                name: "tf2-server",
                                image: variantConfig.image,
                                essential: true,
                            }),
                        ]),
                    }));
                });

                it("should set the correct environment variables", () => {
                    expect(registerTaskDefinitionCommandInput.containerDefinitions![0].environment).toEqual(expect.arrayContaining([
                        { name: "SERVER_HOSTNAME", value: regionConfig.srcdsHostname },
                        { name: "DEMOS_TF_APIKEY", value: process.env.DEMOS_TF_APIKEY },
                        { name: "LOGS_TF_APIKEY", value: process.env.LOGS_TF_APIKEY },
                        { name: "STV_NAME", value: regionConfig.tvHostname },
                        { name: "ADMIN_STEAM_ID", value: testEnvironment.values.adminSteamId },
                        { name: "DEFAULT_5CP_CFG", value: variantConfig.defaultCfgs?.["5cp"] },
                        { name: "DEFAULT_KOTH_CFG", value: variantConfig.defaultCfgs?.["koth"] },
                        { name: "DEFAULT_PL_CFG", value: variantConfig.defaultCfgs?.["pl"] },
                        { name: "DEFAULT_ULTIDUO_CFG", value: variantConfig.defaultCfgs?.["ultiduo"] },
                    ]));
                });

                it("should contain the correct TF2 server commands", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        containerDefinitions: expect.arrayContaining([
                            expect.objectContaining({
                                command: [
                                    "-enablefakeip",
                                    "+sv_pure",
                                    variantConfig.svPure.toString(),
                                    "+maxplayers",
                                    variantConfig.maxPlayers.toString(),
                                    "+map",
                                    variantConfig.map,
                                ],
                            }),
                        ]),
                    }));
                });

                it("should contain the correct mount points", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        containerDefinitions: expect.arrayContaining([
                            expect.objectContaining({
                                mountPoints: expect.arrayContaining([
                                    expect.objectContaining({
                                        sourceVolume: "tf2-maps",
                                        containerPath: "/home/tf2/server/tf/maps",
                                        readOnly: true,
                                    }),
                                ]),
                            }),
                        ]),
                    }));
                });

                it("should mount the EFS", () => {
                    expect(registerTaskDefinitionCommandInput).toEqual(expect.objectContaining({
                        volumes: expect.arrayContaining([
                            expect.objectContaining({
                                name: "tf2-maps",
                                efsVolumeConfiguration: expect.objectContaining({
                                    fileSystemId: efsSystem.FileSystemId,
                                    transitEncryption: "ENABLED",
                                    rootDirectory: "maps",
                                }),
                            }),
                        ]),
                    }));
                });

            })

            describe("ECS Service", () => {

                it("should run 1 task in the ecsCluster", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        cluster: cdkConfig.ecsClusterName,
                        desiredCount: 1,
                    }));
                });


                it("should enable ECS Exec", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        enableExecuteCommand: true,
                    }))
                })

                it("should be of type fargate", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        launchType: "FARGATE",
                    }));
                });

                it("should be attached to the correct network configuration", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        networkConfiguration: {
                            awsvpcConfiguration: {
                                assignPublicIp: "ENABLED",
                                securityGroups: [sgId],
                                subnets: subnetIds,
                            },
                        },
                    }));
                });

                it("should be attached to the correct server id", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        serviceName: serverId,
                    }));
                });

                it("should use the correct taskDefinitionArn", () => {
                    expect(createServiceCommandInput).toEqual(expect.objectContaining({
                        taskDefinition: taskDefinitionArn,
                    }));
                });

            })

            it("should return a DeployedServer object with the correct properties", () => {
                expect(deployedServer).toEqual({
                    hostIp: sdrIp,
                    serverId,
                    hostPort: sdrPort,
                    rconPassword: expect.any(String),
                    region,
                    tvIp: tvIp,
                    tvPort: tvPort,
                    variant: variantName,
                    hostPassword: expect.any(String),
                    rconAddress: publicIp,
                    tvPassword: expect.any(String),
                } as Server);
            })
        })

    })

    describe("deleteServer", () => {
        const testEnvironment = createTestEnvironment();
        const {
            sut,
            awsClients: { ecsMock },
            values: {
                serverId,
                region,
                taskDefinitionArn,
                cdkConfig
            }
        } = testEnvironment

        beforeAll(async () => {
            givenTheExpectedMockResults(testEnvironment);
            await sut.deleteServer({
                serverId,
                region
            })
        })
        it("should force terminate the service", async () => {
            expect(ecsMock).toHaveReceivedCommandWith(DeleteServiceCommand, {
                cluster: cdkConfig.ecsClusterName,
                service: serverId,
                force: true
            })
        })

        it("should deregister the task definition", async () => {
            expect(ecsMock).toHaveReceivedCommandWith(DeregisterTaskDefinitionCommand, {
                taskDefinition: taskDefinitionArn
            })
        })

        it("should delete the task definition", async () => {
            expect(ecsMock).toHaveReceivedCommandWith(DeleteTaskDefinitionsCommand, {
                taskDefinitions: [taskDefinitionArn]
            })
        })
    })

})