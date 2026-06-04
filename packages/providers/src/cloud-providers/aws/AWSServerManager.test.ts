import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudProvider, Region, Variant } from "@tf2qs/core";
import { TF2ServerConfig } from "@tf2qs/core";
import { ServerCredentials } from "@tf2qs/core";
import { TF2ServerConfigFactory } from "@tf2qs/core";
import { TF2ServerReadinessService } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { PasswordGeneratorService } from "@tf2qs/core";
import { AWSServerManager } from "./AWSServerManager";
import {
    EC2InstanceService,
    ECSServiceManager,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService
} from "./interfaces";

// Mock the logger module
vi.mock("@tf2qs/telemetry", async () => {
    const actual = await vi.importActual("@tf2qs/telemetry") as any;
    return {
        ...actual,
        logger: {
            emit: vi.fn()
        },
        meter: {
            createHistogram: vi.fn().mockReturnValue({
                record: vi.fn()
            }),
            createCounter: vi.fn().mockReturnValue({
                add: vi.fn()
            })
        },
        tracer: {
            startSpan: vi.fn().mockReturnValue({
                end: vi.fn(),
                setAttribute: vi.fn()
            })
        }
    };
});

describe("AWSServerManager", () => {
    const mockTaskDefinitionService = {
        create: vi.fn(),
        delete: vi.fn()
    } as unknown as TaskDefinitionService;

    const mockSecurityGroupService = {
        create: vi.fn(),
        delete: vi.fn()
    } as unknown as SecurityGroupService;

    const mockEC2InstanceService = {
        create: vi.fn(),
        terminate: vi.fn()
    } as unknown as EC2InstanceService;

    const mockECSServiceManager = {
        create: vi.fn(),
        waitForStable: vi.fn(),
        delete: vi.fn()
    } as unknown as ECSServiceManager;

    const mockNetworkService = {
        getPublicIp: vi.fn()
    } as unknown as NetworkService;

    const mockTF2ServerReadinessService = {
        waitForReady: vi.fn()
    } as unknown as TF2ServerReadinessService;

    const mockTF2ServerConfigFactory = {
        build: vi.fn()
    } as unknown as TF2ServerConfigFactory;

    const mockPasswordGeneratorService = {
        generatePassword: vi.fn(),
        generateNumericPassword: vi.fn()
    } as unknown as PasswordGeneratorService;

    const mockConfigManager = {
        getVariantConfig: vi.fn(),
        getRegionConfig: vi.fn()
    } as unknown as ConfigManager;

    const mockStatusUpdater = vi.fn();

    const mockVariantConfig = {
        image: "sonikro/tf2-standard-competitive:latest",
        maxPlayers: 12,
        map: "cp_process_final",
        svPure: 2,
        ocpu: 1,
        memory: 4,
        serverName: "TF2 Test Server",
        shape: "t3.medium"
    };

    const mockRegionConfig = {
        displayName: "Buenos Aires",
        srcdsHostname: "bue.tf2pickup.net",
        tvHostname: "tv-bue.tf2pickup.net",
        cloudProvider: CloudProvider.AWS
    };

    const mockCredentials = new ServerCredentials({
        serverPassword: "server123",
        rconPassword: "rcon123",
        tvPassword: "tv123",
        logSecret: 12345,
    });

    const mockTF2ServerConfig = new TF2ServerConfig({
        credentials: mockCredentials,
        environmentVariables: {
            "RCON_PASSWORD": "rcon123",
            "SERVER_PASSWORD": "server123",
            "STV_PASSWORD": "tv123",
        },
        containerImage: "sonikro/tf2-standard-competitive:latest",
        startupMap: "cp_process_final",
        maxPlayers: 12,
        svPure: 2,
        containerArgs: ["-enablefakeip", "+map", "cp_process_final"],
    });

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(mockConfigManager.getVariantConfig).mockReturnValue(mockVariantConfig);
        vi.mocked(mockConfigManager.getRegionConfig).mockReturnValue(mockRegionConfig);
        vi.mocked(mockTF2ServerConfigFactory.build).mockResolvedValue(mockTF2ServerConfig);

        // Setup service mock return values
        vi.mocked(mockSecurityGroupService.create).mockResolvedValue("sg-12345");
        vi.mocked(mockTaskDefinitionService.create).mockResolvedValue("arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1");
        vi.mocked(mockEC2InstanceService.create).mockResolvedValue("i-12345");
        vi.mocked(mockECSServiceManager.create).mockResolvedValue("arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123");
        vi.mocked(mockECSServiceManager.waitForStable).mockResolvedValue();
        vi.mocked(mockNetworkService.getPublicIp).mockResolvedValue("1.2.3.4");
        vi.mocked(mockTF2ServerReadinessService.waitForReady).mockResolvedValue("169.254.1.1:27015");
    });

    describe("deployServer", () => {
        const deployArgs = {
            serverId: "test-server-123",
            region: Region.US_EAST_1_BUE_1,
            variantName: "standard-competitive" as Variant,
            statusUpdater: mockStatusUpdater,
            sourcemodAdminSteamId: "STEAM_1:1:123456789",
            extraEnvs: { "CUSTOM_VAR": "custom_value" }
        };

        it("orchestrates deployment workflow correctly", async () => {
            const serverManager = new AWSServerManager(
                mockTaskDefinitionService,
                mockSecurityGroupService,
                mockEC2InstanceService,
                mockECSServiceManager,
                mockNetworkService,
                mockTF2ServerReadinessService,
                mockTF2ServerConfigFactory,
                mockConfigManager
            );

            const result = await serverManager.deployServer(deployArgs);

            // Verify config retrieval
            expect(mockConfigManager.getVariantConfig).toHaveBeenCalledWith("standard-competitive");
            expect(mockConfigManager.getRegionConfig).toHaveBeenCalledWith(Region.US_EAST_1_BUE_1);

            // Verify factory is called with correct DeploymentContext
            expect(mockTF2ServerConfigFactory.build).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverId: "test-server-123",
                    region: Region.US_EAST_1_BUE_1,
                    variantName: "standard-competitive",
                    sourcemodAdminSteamId: "STEAM_1:1:123456789",
                    extraEnvs: { "CUSTOM_VAR": "custom_value" }
                }),
                mockVariantConfig,
                mockRegionConfig
            );

            // Verify deployment steps are called in correct order
            expect(mockSecurityGroupService.create).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);

            expect(mockTaskDefinitionService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverId: "test-server-123",
                    region: Region.US_EAST_1_BUE_1,
                }),
                mockTF2ServerConfig.credentials,
                mockTF2ServerConfig.environmentVariables
            );

            expect(mockEC2InstanceService.create).toHaveBeenCalledWith({
                serverId: "test-server-123",
                region: Region.US_EAST_1_BUE_1,
                variantConfig: mockVariantConfig,
                securityGroupId: "sg-12345"
            });

            expect(mockECSServiceManager.create).toHaveBeenCalledWith(
                "test-server-123",
                Region.US_EAST_1_BUE_1,
                "arn:aws:ecs:us-east-1:123456789012:task-definition/test-server-123:1"
            );

            expect(mockECSServiceManager.waitForStable).toHaveBeenCalledWith(
                "arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123",
                Region.US_EAST_1_BUE_1
            );

            expect(mockNetworkService.getPublicIp).toHaveBeenCalledWith("i-12345", Region.US_EAST_1_BUE_1);

            expect(mockTF2ServerReadinessService.waitForReady).toHaveBeenCalledWith(
                "1.2.3.4",
                "rcon123",
                "test-server-123"
            );

            // Verify status updates are called in correct order
            expect(mockStatusUpdater).toHaveBeenCalledTimes(7);
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(1, "🛡️ [1/7] Creating security group...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(2, "📋 [2/7] Creating task definition...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(3, "🖥️ [3/7] Launching EC2 instance...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(4, "🚀 [4/7] Creating ECS service...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(5, "⏳ [5/7] Waiting for service to stabilize (this can take up to 15 minutes in AWS Experimental Zones)...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(6, "🌐 [6/7] Getting public IP...");
            expect(mockStatusUpdater).toHaveBeenNthCalledWith(7, "🔄 [7/7] Waiting for TF2 server to be ready to receive RCON Commands...");

            // Verify result structure
            expect(result).toEqual({
                serverId: "test-server-123",
                region: Region.US_EAST_1_BUE_1,
                variant: "standard-competitive",
                hostIp: "169.254.1.1",
                hostPort: 27015,
                tvIp: "1.2.3.4",
                tvPort: 27020,
                rconPassword: "rcon123",
                rconAddress: "1.2.3.4",
                hostPassword: "server123",
                tvPassword: "tv123"
            });
        });

        it("handles deployment errors correctly", async () => {
            const error = new Error("Security group creation failed");
            vi.mocked(mockSecurityGroupService.create).mockRejectedValue(error);

            const serverManager = new AWSServerManager(
                mockTaskDefinitionService,
                mockSecurityGroupService,
                mockEC2InstanceService,
                mockECSServiceManager,
                mockNetworkService,
                mockTF2ServerReadinessService,
                mockTF2ServerConfigFactory,
                mockConfigManager
            );

            await expect(serverManager.deployServer(deployArgs))
                .rejects.toThrowError("Security group creation failed");

            // Verify that subsequent services are not called after error
            expect(mockSecurityGroupService.create).toHaveBeenCalled();
            expect(mockTaskDefinitionService.create).not.toHaveBeenCalled();
            expect(mockEC2InstanceService.create).not.toHaveBeenCalled();
        });
    });

    describe("deleteServer", () => {
        const deleteArgs = {
            serverId: "test-server-123",
            region: Region.US_EAST_1_BUE_1
        };

        it("orchestrates deletion workflow correctly", async () => {
            vi.mocked(mockECSServiceManager.delete).mockResolvedValue();
            vi.mocked(mockEC2InstanceService.terminate).mockResolvedValue();
            vi.mocked(mockSecurityGroupService.delete).mockResolvedValue();
            vi.mocked(mockTaskDefinitionService.delete).mockResolvedValue();

            const serverManager = new AWSServerManager(
                mockTaskDefinitionService,
                mockSecurityGroupService,
                mockEC2InstanceService,
                mockECSServiceManager,
                mockNetworkService,
                mockTF2ServerReadinessService,
                mockTF2ServerConfigFactory,
                mockConfigManager
            );

            await serverManager.deleteServer(deleteArgs);

            // Verify deletion steps are called in correct order:
            // 1. ECS Service, 2. EC2 Instance, 3. Task Definition, 4. Security Group
            expect(mockECSServiceManager.delete).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);
            expect(mockEC2InstanceService.terminate).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);
            expect(mockTaskDefinitionService.delete).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);
            expect(mockSecurityGroupService.delete).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);

            // Verify call order by checking mock call counts at each verification
            const ecsCallOrder = vi.mocked(mockECSServiceManager.delete).mock.invocationCallOrder[0];
            const ec2CallOrder = vi.mocked(mockEC2InstanceService.terminate).mock.invocationCallOrder[0];
            const taskDefCallOrder = vi.mocked(mockTaskDefinitionService.delete).mock.invocationCallOrder[0];
            const sgCallOrder = vi.mocked(mockSecurityGroupService.delete).mock.invocationCallOrder[0];

            expect(ecsCallOrder).toBeLessThan(ec2CallOrder);
            expect(ec2CallOrder).toBeLessThan(taskDefCallOrder);
            expect(taskDefCallOrder).toBeLessThan(sgCallOrder);
        });

        it("handles deletion errors correctly", async () => {
            const error = new Error("ECS service deletion failed");
            vi.mocked(mockECSServiceManager.delete).mockRejectedValue(error);

            const serverManager = new AWSServerManager(
                mockTaskDefinitionService,
                mockSecurityGroupService,
                mockEC2InstanceService,
                mockECSServiceManager,
                mockNetworkService,
                mockTF2ServerReadinessService,
                mockTF2ServerConfigFactory,
                mockConfigManager
            );

            await expect(serverManager.deleteServer(deleteArgs))
                .rejects.toThrowError("ECS service deletion failed");

            // Verify that deletion was attempted
            expect(mockECSServiceManager.delete).toHaveBeenCalledWith("test-server-123", Region.US_EAST_1_BUE_1);
        });
    });

    describe("static create method", () => {
        it("creates AWSServerManager with proper dependency injection", () => {
            const mockAWSClientFactory = vi.fn();
            const mockServerCommander = {} as any;

            const dependencies = {
                configManager: mockConfigManager,
                awsClientFactory: mockAWSClientFactory,
                serverCommander: mockServerCommander,
                passwordGeneratorService: mockPasswordGeneratorService
            };

            const serverManager = AWSServerManager.create(dependencies);

            expect(serverManager).toBeInstanceOf(AWSServerManager);
        });
    });
});
