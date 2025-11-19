import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudProvider, Region, Variant } from "@tf2qs/core/src/domain";
import { ServerCredentials } from "@tf2qs/core/src/models";
import { EnvironmentBuilderService } from "@tf2qs/core/src/services/EnvironmentBuilderService";
import { PasswordGeneratorService } from "@tf2qs/core/src/services/PasswordGeneratorService";
import { TF2ServerReadinessService } from "@tf2qs/core/src/services/TF2ServerReadinessService";
import { ConfigManager } from "@tf2qs/core/src/utils/ConfigManager";
import { AWSServerManager } from "./AWSServerManager";
import {
    EC2InstanceService,
    ECSServiceManager,
    NetworkService,
    SecurityGroupService,
    TaskDefinitionService
} from "./interfaces";

// Mock the logger module
vi.mock("@tf2qs/telemetry/src/otel", () => ({
    logger: {
        emit: vi.fn()
    }
}));

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

    const mockEnvironmentBuilderService = {
        build: vi.fn()
    } as unknown as EnvironmentBuilderService;

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

    const mockEnvironment = {
        "RCON_PASSWORD": "rcon123",
        "SERVER_PASSWORD": "server123",
        "TV_PASSWORD": "tv123"
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock implementations
        vi.mocked(mockPasswordGeneratorService.generatePassword).mockReturnValue("password123");
        vi.mocked(mockPasswordGeneratorService.generateNumericPassword).mockReturnValue(12345);
        vi.mocked(mockConfigManager.getVariantConfig).mockReturnValue(mockVariantConfig);
        vi.mocked(mockConfigManager.getRegionConfig).mockReturnValue(mockRegionConfig);
        vi.mocked(mockEnvironmentBuilderService.build).mockReturnValue(mockEnvironment);

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
                mockEnvironmentBuilderService,
                mockPasswordGeneratorService,
                mockConfigManager
            );

            const result = await serverManager.deployServer(deployArgs);

            // Verify the orchestration order and calls
            expect(mockConfigManager.getVariantConfig).toHaveBeenCalledWith("standard-competitive");
            expect(mockConfigManager.getRegionConfig).toHaveBeenCalledWith(Region.US_EAST_1_BUE_1);

            expect(mockEnvironmentBuilderService.build).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverId: "test-server-123",
                    region: Region.US_EAST_1_BUE_1,
                    variantName: "standard-competitive",
                    sourcemodAdminSteamId: "STEAM_1:1:123456789",
                    extraEnvs: { "CUSTOM_VAR": "custom_value" }
                }),
                expect.objectContaining({
                    serverPassword: "password123",
                    tvPassword: "password123",
                    rconPassword: "password123",
                    logSecret: 12345
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
                    variantName: "standard-competitive",
                    sourcemodAdminSteamId: "STEAM_1:1:123456789",
                    extraEnvs: { "CUSTOM_VAR": "custom_value" }
                }),
                expect.any(ServerCredentials),
                mockEnvironment
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
                expect.any(String),
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
                rconPassword: "password123",
                rconAddress: "1.2.3.4",
                hostPassword: "password123",
                tvPassword: "password123"
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
                mockEnvironmentBuilderService,
                mockPasswordGeneratorService,
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
                mockEnvironmentBuilderService,
                mockPasswordGeneratorService,
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
                mockEnvironmentBuilderService,
                mockPasswordGeneratorService,
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
