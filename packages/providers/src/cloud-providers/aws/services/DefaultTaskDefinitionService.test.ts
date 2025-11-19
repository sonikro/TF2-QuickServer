import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
    ECSClient,
    DeleteTaskDefinitionsCommand,
    ListTaskDefinitionsCommand,
    RegisterTaskDefinitionCommand,
    TransportProtocol
} from "@aws-sdk/client-ecs";
import { Region } from "@tf2qs/core/src/domain";
import { DeploymentContext } from "@tf2qs/core/src/models/DeploymentContext";
import { ServerCredentials } from "@tf2qs/core/src/models/ServerCredentials";
import { ConfigManager } from "@tf2qs/core/src/utils/ConfigManager";
import { OperationTracingService } from "@tf2qs/telemetry/src/OperationTracingService";
import { AWSConfigService } from "./AWSConfigService";
import { DefaultTaskDefinitionService } from "./DefaultTaskDefinitionService";

const ecsClientMock = mockClient(ECSClient);

describe("DefaultTaskDefinitionService", () => {
    const mockConfigManager = {
        getVariantConfig: vi.fn()
    } as unknown as ConfigManager;

    const mockAWSConfigService = {
        getClients: vi.fn(),
        getRegionConfig: vi.fn()
    } as unknown as AWSConfigService;

    const mockTracingService = {
        executeWithTracing: vi.fn(),
        logOperationStart: vi.fn(),
        logOperationSuccess: vi.fn()
    } as unknown as OperationTracingService;

    beforeEach(() => {
        ecsClientMock.reset();
        vi.clearAllMocks();
        
        // Clear any existing environment variables
        delete process.env.NEW_RELIC_LICENSE_KEY;
        
        // Setup default mocks
        vi.mocked(mockAWSConfigService.getClients).mockReturnValue({
            ecsClient: ecsClientMock as unknown as ECSClient,
            ec2Client: {} as any,
            ceClient: {} as any
        });

        vi.mocked(mockAWSConfigService.getRegionConfig).mockReturnValue({
            rootRegion: "us-east-1",
            cluster_name: "test-cluster",
            subnet_id: "subnet-12345",
            vpc_id: "vpc-12345",
            task_execution_role_arn: "arn:aws:iam::123456789012:role/execution-role",
            task_role_arn: "arn:aws:iam::123456789012:role/task-role",
            instance_profile_arn: "arn:aws:iam::123456789012:instance-profile/test-profile",
            log_group_name: "test-log-group"
        });

        vi.mocked(mockConfigManager.getVariantConfig).mockReturnValue({
            image: "sonikro/tf2-standard-competitive:latest",
            svPure: 2,
            maxPlayers: 12,
            map: "cp_process_final"
        } as any);

        vi.mocked(mockTracingService.executeWithTracing).mockImplementation(async (_, __, fn) => await fn({} as any));
    });

    afterEach(() => {
        // Clean up environment variables after each test
        delete process.env.NEW_RELIC_LICENSE_KEY;
    });

    describe("create", () => {
        const context = {
            serverId: "test-server-123",
            region: Region.US_EAST_1_BUE_1,
            variantName: "standard-competitive"
        } as DeploymentContext;

        const credentials = {
            rconPassword: "rcon123",
            serverPassword: "server123",
            tvPassword: "tv123"
        } as ServerCredentials;

        const environment = {
            "RCON_PASSWORD": "rcon123",
            "SERVER_PASSWORD": "server123",
            "TV_PASSWORD": "tv123"
        };

        it("creates task definition successfully without NewRelic", async () => {
            const taskDefinitionArn = "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1";
            
            ecsClientMock.on(RegisterTaskDefinitionCommand).resolves({
                taskDefinition: {
                    taskDefinitionArn
                }
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            const result = await service.create(context, credentials, environment);
            
            expect(result).toBe(taskDefinitionArn);
            expect(ecsClientMock).toHaveReceivedCommandWith(RegisterTaskDefinitionCommand, {
                family: "test-server-123",
                networkMode: "host",
                requiresCompatibilities: ["EC2"],
                executionRoleArn: "arn:aws:iam::123456789012:role/execution-role",
                taskRoleArn: "arn:aws:iam::123456789012:role/task-role",
                containerDefinitions: [{
                    name: "tf2-server",
                    image: "sonikro/tf2-standard-competitive:latest",
                    essential: true,
                    cpu: 1536,
                    memory: 3584,
                    environment: [
                        { name: "RCON_PASSWORD", value: "rcon123" },
                        { name: "SERVER_PASSWORD", value: "server123" },
                        { name: "TV_PASSWORD", value: "tv123" }
                    ],
                    command: [
                        "-enablefakeip",
                        "+sv_pure",
                        "2",
                        "+maxplayers",
                        "12",
                        "+map",
                        "cp_process_final"
                    ],
                    portMappings: [
                        { containerPort: 27015, hostPort: 27015, protocol: TransportProtocol.TCP },
                        { containerPort: 27015, hostPort: 27015, protocol: TransportProtocol.UDP },
                        { containerPort: 27020, hostPort: 27020, protocol: TransportProtocol.TCP },
                        { containerPort: 27020, hostPort: 27020, protocol: TransportProtocol.UDP }
                    ]
                }]
            });
        });

        it("creates task definition successfully with NewRelic sidecar", async () => {
            // Set up NewRelic environment variable
            process.env.NEW_RELIC_LICENSE_KEY = "test-license-key";
            
            const taskDefinitionArn = "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1";
            
            ecsClientMock.on(RegisterTaskDefinitionCommand).resolves({
                taskDefinition: {
                    taskDefinitionArn
                }
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            const result = await service.create(context, credentials, environment);
            
            expect(result).toBe(taskDefinitionArn);
            expect(ecsClientMock).toHaveReceivedCommandWith(RegisterTaskDefinitionCommand, {
                family: "test-server-123",
                networkMode: "host",
                requiresCompatibilities: ["EC2"],
                executionRoleArn: "arn:aws:iam::123456789012:role/execution-role",
                taskRoleArn: "arn:aws:iam::123456789012:role/task-role",
                containerDefinitions: [
                    {
                        name: "tf2-server",
                        image: "sonikro/tf2-standard-competitive:latest",
                        essential: true,
                        cpu: 1536,
                        memory: 3584,
                        environment: [
                            { name: "RCON_PASSWORD", value: "rcon123" },
                            { name: "SERVER_PASSWORD", value: "server123" },
                            { name: "TV_PASSWORD", value: "tv123" }
                        ],
                        command: [
                            "-enablefakeip",
                            "+sv_pure",
                            "2",
                            "+maxplayers",
                            "12",
                            "+map",
                            "cp_process_final"
                        ],
                        portMappings: [
                            { containerPort: 27015, hostPort: 27015, protocol: TransportProtocol.TCP },
                            { containerPort: 27015, hostPort: 27015, protocol: TransportProtocol.UDP },
                            { containerPort: 27020, hostPort: 27020, protocol: TransportProtocol.TCP },
                            { containerPort: 27020, hostPort: 27020, protocol: TransportProtocol.UDP }
                        ]
                    },
                    {
                        name: "newrelic-infra",
                        image: "newrelic/infrastructure:latest",
                        essential: false,
                        cpu: 128,
                        memory: 256,
                        environment: [
                            { name: "NRIA_LICENSE_KEY", value: "test-license-key" },
                            { name: "NRIA_DISPLAY_NAME", value: "TF2-Server-us-east-1-bue-1-test-server-123" },
                            { name: "NRIA_OVERRIDE_HOSTNAME", value: "tf2-server-us-east-1-bue-1-test-server-123" },
                            { name: "NRIA_CUSTOM_ATTRIBUTES", value: "region=us-east-1-bue-1,serverId=test-server-123,variant=standard-competitive" }
                        ]
                    }
                ]
            });
        });

        it("does not add NewRelic sidecar when license key is empty", async () => {
            // Set up empty NewRelic environment variable
            process.env.NEW_RELIC_LICENSE_KEY = "";
            
            const taskDefinitionArn = "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1";
            
            ecsClientMock.on(RegisterTaskDefinitionCommand).resolves({
                taskDefinition: {
                    taskDefinitionArn
                }
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            const result = await service.create(context, credentials, environment);
            
            expect(result).toBe(taskDefinitionArn);
            
            // Verify only one container definition (TF2 server) is created
            const registerCall = ecsClientMock.commandCalls(RegisterTaskDefinitionCommand)[0];
            const containerDefinitions = registerCall.args[0].input.containerDefinitions;
            expect(containerDefinitions).toBeDefined();
            expect(containerDefinitions).toHaveLength(1);
            expect(containerDefinitions![0].name).toBe("tf2-server");
        });

        it("throws error when task definition registration fails", async () => {
            ecsClientMock.on(RegisterTaskDefinitionCommand).resolves({
                taskDefinition: {}
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            await expect(service.create(context, credentials, environment))
                .rejects.toThrowError("Failed to register task definition");
        });
    });

    describe("delete", () => {
        it("deletes task definition successfully", async () => {
            const taskDefinitionArn = "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1";
            
            ecsClientMock.on(ListTaskDefinitionsCommand).resolves({
                taskDefinitionArns: [taskDefinitionArn]
            });

            ecsClientMock.on(DeleteTaskDefinitionsCommand).resolves({});

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(ecsClientMock).toHaveReceivedCommandWith(ListTaskDefinitionsCommand, {
                familyPrefix: "test-server-123",
                sort: "DESC",
                maxResults: 1
            });
            expect(ecsClientMock).toHaveReceivedCommandWith(DeleteTaskDefinitionsCommand, {
                taskDefinitions: [taskDefinitionArn]
            });
        });

        it("handles task definition not found gracefully", async () => {
            ecsClientMock.on(ListTaskDefinitionsCommand).resolves({
                taskDefinitionArns: []
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(ecsClientMock).toHaveReceivedCommand(ListTaskDefinitionsCommand);
            expect(ecsClientMock).not.toHaveReceivedCommand(DeleteTaskDefinitionsCommand);
        });
    });

    describe("findTaskDefinitionArn", () => {
        it("returns task definition ARN when found", async () => {
            const taskDefinitionArn = "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1";
            
            ecsClientMock.on(ListTaskDefinitionsCommand).resolves({
                taskDefinitionArns: [taskDefinitionArn]
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            const result = await service.findTaskDefinitionArn("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(result).toBe(taskDefinitionArn);
        });

        it("returns undefined when task definition not found", async () => {
            ecsClientMock.on(ListTaskDefinitionsCommand).resolves({
                taskDefinitionArns: []
            });

            const service = new DefaultTaskDefinitionService(mockConfigManager, mockAWSConfigService, mockTracingService);
            
            const result = await service.findTaskDefinitionArn("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(result).toBeUndefined();
        });
    });
});
