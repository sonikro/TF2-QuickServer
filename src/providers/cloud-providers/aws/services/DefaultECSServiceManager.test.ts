import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
    ECSClient,
    CreateServiceCommand,
    DeleteServiceCommand,
    DescribeServicesCommand,
    waitUntilServicesStable
} from "@aws-sdk/client-ecs";
import { Region } from "../../../../core/domain";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { AWSConfigService } from "./AWSConfigService";
import { DefaultECSServiceManager } from "./DefaultECSServiceManager";
import { waitUntil } from "../../../utils/waitUntil";

vi.mock("@aws-sdk/client-ecs", async () => {
    const actual = await vi.importActual("@aws-sdk/client-ecs");
    return {
        ...actual,
        waitUntilServicesStable: vi.fn()
    };
});

vi.mock("../../../utils/waitUntil", () => ({
    waitUntil: vi.fn()
}));

const ecsClientMock = mockClient(ECSClient);

describe("DefaultECSServiceManager", () => {
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
        
        // Setup default mocks
        vi.mocked(mockAWSConfigService.getClients).mockReturnValue({
            ecsClient: ecsClientMock as unknown as ECSClient,
            ec2Client: {} as any
        });

        vi.mocked(mockAWSConfigService.getRegionConfig).mockReturnValue({
            rootRegion: "us-east-1",
            cluster_name: "test-cluster",
            subnet_id: "subnet-12345",
            instance_profile_arn: "arn:aws:iam::123456789012:instance-profile/test-profile",
            log_group_name: "test-log-group",
            task_execution_role_arn: "arn:aws:iam::123456789012:role/execution-role",
            task_role_arn: "arn:aws:iam::123456789012:role/task-role",
            vpc_id: "vpc-12345"
        });

        vi.mocked(mockTracingService.executeWithTracing).mockImplementation(async (_, __, fn) => await fn({} as any));
    });

    describe("create", () => {
        it("creates ECS service successfully", async () => {
            const serviceArn = "arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123";
            
            ecsClientMock.on(CreateServiceCommand).resolves({
                service: {
                    serviceArn
                }
            });

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            const result = await service.create(
                "test-server-123",
                Region.US_EAST_1_BUE_1,
                "arn:aws:ecs:us-east-1:123456789012:task-definition/test-task:1"
            );
            
            expect(result).toBe(serviceArn);
            expect(ecsClientMock).toHaveReceivedCommandWith(CreateServiceCommand, {
                cluster: "test-cluster",
                serviceName: "test-server-123",
                taskDefinition: "arn:aws:ecs:us-east-1:123456789012:task-definition/test-task:1",
                desiredCount: 1,
                launchType: "EC2",
                placementConstraints: [{
                    type: "memberOf",
                    expression: "attribute:server-id == test-server-123"
                }]
            });
        });

        it("throws error when service creation fails", async () => {
            ecsClientMock.on(CreateServiceCommand).resolves({
                service: {}
            });

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await expect(service.create(
                "test-server-123",
                Region.US_EAST_1_BUE_1,
                "arn:aws:ecs:us-east-1:123456789012:task-definition/test-task:1"
            )).rejects.toThrowError("Failed to create ECS service");
        });
    });

    describe("waitForStable", () => {
        it("waits for service to be stable", async () => {
            vi.mocked(waitUntilServicesStable).mockResolvedValue({ $metadata: {} } as any);

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await service.waitForStable(
                "arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123",
                Region.US_EAST_1_BUE_1
            );
            
            expect(waitUntilServicesStable).toHaveBeenCalledWith(
                {
                    client: ecsClientMock,
                    maxWaitTime: 900,
                    maxDelay: 15,
                    minDelay: 15,
                    abortSignal: undefined
                },
                {
                    cluster: "test-cluster",
                    services: ["arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123"]
                }
            );
        });

        it("waits for service to be stable with abort signal", async () => {
            const abortController = new AbortController();
            vi.mocked(waitUntilServicesStable).mockResolvedValue({ $metadata: {} } as any);

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await service.waitForStable(
                "arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-server-123",
                Region.US_EAST_1_BUE_1,
                abortController.signal
            );
            
            expect(waitUntilServicesStable).toHaveBeenCalledWith(
                expect.objectContaining({
                    abortSignal: abortController.signal
                }),
                expect.any(Object)
            );
        });
    });

    describe("delete", () => {
        it("deletes ECS service successfully", async () => {
            ecsClientMock.on(DeleteServiceCommand).resolves({});
            ecsClientMock.on(DescribeServicesCommand).resolves({
                services: [{
                    status: 'DELETED'
                }]
            });

            vi.mocked(waitUntil).mockImplementation(async (fn) => {
                await fn();
                return;
            });

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(ecsClientMock).toHaveReceivedCommandWith(DeleteServiceCommand, {
                cluster: "test-cluster",
                service: "test-server-123",
                force: true
            });
            expect(ecsClientMock).toHaveReceivedCommandWith(DescribeServicesCommand, {
                cluster: "test-cluster",
                services: ["test-server-123"]
            });
        });

        it("handles ServiceNotFoundException gracefully (idempotent)", async () => {
            const error = new Error("Service not found");
            (error as any).Code = "ServiceNotFoundException";
            ecsClientMock.on(DeleteServiceCommand).rejects(error);

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await expect(service.delete("test-server-123", Region.US_EAST_1_BUE_1)).resolves.not.toThrow();
            
            expect(vi.mocked(mockTracingService.logOperationSuccess)).toHaveBeenCalledWith(
                expect.stringContaining("ECS service not found"),
                "test-server-123",
                Region.US_EAST_1_BUE_1
            );
        });

        it("throws error on non-idempotent failures", async () => {
            const error = new Error("Some other error");
            ecsClientMock.on(DeleteServiceCommand).rejects(error);

            const service = new DefaultECSServiceManager(mockAWSConfigService, mockTracingService);
            
            await expect(service.delete("test-server-123", Region.US_EAST_1_BUE_1)).rejects.toThrow("Some other error");
        });
    });
});
