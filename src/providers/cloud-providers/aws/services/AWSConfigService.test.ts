import { describe, it, expect, vi, beforeEach } from "vitest";
import { Region } from "../../../../core/domain";
import { ConfigManager } from "../../../../core/utils/ConfigManager";
import { AWSClients } from "../../../services/defaultAWSServiceFactory";
import { AWSConfigService } from "./AWSConfigService";

describe("AWSConfigService", () => {
    const mockConfigManager = {
        getAWSConfig: vi.fn()
    } as unknown as ConfigManager;

    const mockAWSClients = {
        ecsClient: {},
        ec2Client: {}
    } as AWSClients;

    const mockAWSClientFactory = vi.fn().mockReturnValue(mockAWSClients);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getConfigManager", () => {
        it("returns the config manager instance", () => {
            const service = new AWSConfigService(mockConfigManager, mockAWSClientFactory);
            
            const result = service.getConfigManager();
            
            expect(result).toBe(mockConfigManager);
        });
    });

    describe("getRegionConfig", () => {
        it("returns region config for valid region", () => {
            const mockRegionConfig = {
                rootRegion: "us-east-1",
                cluster_name: "test-cluster",
                subnet_id: "subnet-12345",
                vpc_id: "vpc-12345",
                task_execution_role_arn: "arn:aws:iam::123456789012:role/execution-role",
                task_role_arn: "arn:aws:iam::123456789012:role/task-role",
                instance_profile_arn: "arn:aws:iam::123456789012:instance-profile/test-profile",
                log_group_name: "test-log-group"
            };
            const mockAWSConfig = {
                regions: {
                    [Region.US_EAST_1_BUE_1A]: mockRegionConfig
                }
            } as any;
            vi.mocked(mockConfigManager.getAWSConfig).mockReturnValue(mockAWSConfig);

            const service = new AWSConfigService(mockConfigManager, mockAWSClientFactory);
            
            const result = service.getRegionConfig(Region.US_EAST_1_BUE_1A);
            
            expect(result).toBe(mockRegionConfig);
            expect(mockConfigManager.getAWSConfig).toHaveBeenCalledTimes(1);
        });

        it("throws error for unconfigured region", () => {
            const mockAWSConfig = {
                regions: {}
            };
            vi.mocked(mockConfigManager.getAWSConfig).mockReturnValue(mockAWSConfig);

            const service = new AWSConfigService(mockConfigManager, mockAWSClientFactory);
            
            expect(() => service.getRegionConfig(Region.US_EAST_1_BUE_1A))
                .toThrowError("Region us-east-1-bue-1a is not configured in AWS config");
        });
    });

    describe("getClients", () => {
        it("returns AWS clients for valid region", () => {
            const mockRegionConfig = {
                rootRegion: "us-east-1",
                cluster_name: "test-cluster",
                subnet_id: "subnet-12345",
                vpc_id: "vpc-12345",
                task_execution_role_arn: "arn:aws:iam::123456789012:role/execution-role",
                task_role_arn: "arn:aws:iam::123456789012:role/task-role",
                instance_profile_arn: "arn:aws:iam::123456789012:instance-profile/test-profile",
                log_group_name: "test-log-group"
            };
            const mockAWSConfig = {
                regions: {
                    [Region.US_EAST_1_BUE_1A]: mockRegionConfig
                }
            } as any;
            vi.mocked(mockConfigManager.getAWSConfig).mockReturnValue(mockAWSConfig);

            const service = new AWSConfigService(mockConfigManager, mockAWSClientFactory);
            
            const result = service.getClients(Region.US_EAST_1_BUE_1A);
            
            expect(result).toBe(mockAWSClients);
            expect(mockAWSClientFactory).toHaveBeenCalledWith("us-east-1");
        });

        it("throws error when getting clients for unconfigured region", () => {
            const mockAWSConfig = {
                regions: {}
            } as any;
            vi.mocked(mockConfigManager.getAWSConfig).mockReturnValue(mockAWSConfig);

            const service = new AWSConfigService(mockConfigManager, mockAWSClientFactory);
            
            expect(() => service.getClients(Region.US_EAST_1_BUE_1A))
                .toThrowError("Region us-east-1-bue-1a is not configured in AWS config");
        });
    });
});
