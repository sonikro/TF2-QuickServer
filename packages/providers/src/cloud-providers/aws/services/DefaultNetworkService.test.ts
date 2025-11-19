import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { Region } from "@tf2qs/core/src/domain";
import { OperationTracingService } from "@tf2qs/telemetry/src/OperationTracingService";
import { AWSConfigService } from "./AWSConfigService";
import { DefaultNetworkService } from "./DefaultNetworkService";

const ec2ClientMock = mockClient(EC2Client);

describe("DefaultNetworkService", () => {
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
        ec2ClientMock.reset();
        vi.clearAllMocks();
        
        // Setup default mocks
        vi.mocked(mockAWSConfigService.getClients).mockReturnValue({
            ec2Client: ec2ClientMock as unknown as EC2Client,
            ecsClient: {} as any,
            ceClient: {} as any,
        });

        vi.mocked(mockTracingService.executeWithTracing).mockImplementation(async (_, __, fn) => await fn({} as any));
    });

    describe("getPublicIp", () => {
        it("returns public IP successfully", async () => {
            ec2ClientMock.on(DescribeInstancesCommand).resolves({
                Reservations: [{
                    Instances: [{
                        PublicIpAddress: "1.2.3.4"
                    }]
                }]
            });

            const service = new DefaultNetworkService(mockAWSConfigService, mockTracingService);
            
            const result = await service.getPublicIp("i-12345", Region.US_EAST_1_BUE_1);
            
            expect(result).toBe("1.2.3.4");
            expect(ec2ClientMock).toHaveReceivedCommandWith(DescribeInstancesCommand, {
                InstanceIds: ["i-12345"]
            });
        });

        it("throws error when instance not found", async () => {
            ec2ClientMock.on(DescribeInstancesCommand).resolves({
                Reservations: []
            });

            const service = new DefaultNetworkService(mockAWSConfigService, mockTracingService);
            
            await expect(service.getPublicIp("i-12345", Region.US_EAST_1_BUE_1))
                .rejects.toThrowError("EC2 instance not found");
        });

        it("throws error when no public IP assigned", async () => {
            ec2ClientMock.on(DescribeInstancesCommand).resolves({
                Reservations: [{
                    Instances: [{
                        PublicIpAddress: undefined
                    }]
                }]
            });

            const service = new DefaultNetworkService(mockAWSConfigService, mockTracingService);
            
            await expect(service.getPublicIp("i-12345", Region.US_EAST_1_BUE_1))
                .rejects.toThrowError("Failed to retrieve public IP from EC2 instance. Instance may not be in a public subnet or may not have a public IP assigned.");
        });

        it("throws error when reservations is empty", async () => {
            ec2ClientMock.on(DescribeInstancesCommand).resolves({
                Reservations: [{
                    Instances: []
                }]
            });

            const service = new DefaultNetworkService(mockAWSConfigService, mockTracingService);
            
            await expect(service.getPublicIp("i-12345", Region.US_EAST_1_BUE_1))
                .rejects.toThrowError("EC2 instance not found");
        });
    });
});
