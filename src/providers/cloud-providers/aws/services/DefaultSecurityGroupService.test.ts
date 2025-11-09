import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
    EC2Client,
    AuthorizeSecurityGroupIngressCommand,
    CreateSecurityGroupCommand,
    DeleteSecurityGroupCommand,
    DescribeSecurityGroupsCommand
} from "@aws-sdk/client-ec2";
import { Region } from "../../../../core/domain";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { AWSConfigService } from "./AWSConfigService";
import { DefaultSecurityGroupService } from "./DefaultSecurityGroupService";

const ec2ClientMock = mockClient(EC2Client);

describe("DefaultSecurityGroupService", () => {
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

        vi.mocked(mockTracingService.executeWithTracing).mockImplementation(async (_, __, fn) => await fn({} as any));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("create", () => {
        it("creates security group successfully", async () => {
            ec2ClientMock.on(CreateSecurityGroupCommand).resolves({
                GroupId: "sg-12345"
            });

            ec2ClientMock.on(AuthorizeSecurityGroupIngressCommand).resolves({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            const result = await service.create("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(result).toBe("sg-12345");
            expect(ec2ClientMock).toHaveReceivedCommandWith(CreateSecurityGroupCommand, {
                GroupName: "test-server-123",
                Description: "Security group for TF2 server test-server-123",
                VpcId: "vpc-12345"
            });
            expect(ec2ClientMock).toHaveReceivedCommandWith(AuthorizeSecurityGroupIngressCommand, {
                GroupId: "sg-12345",
                IpPermissions: [
                    {
                        IpProtocol: 'tcp',
                        FromPort: 27015,
                        ToPort: 27020,
                        IpRanges: [{ CidrIp: '0.0.0.0/0' }]
                    },
                    {
                        IpProtocol: 'udp',
                        FromPort: 27015,
                        ToPort: 27020,
                        IpRanges: [{ CidrIp: '0.0.0.0/0' }]
                    }
                ]
            });
        });
    });

    describe("delete", () => {
        it("deletes security group successfully", async () => {
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            ec2ClientMock.on(DeleteSecurityGroupCommand).resolves({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(ec2ClientMock).toHaveReceivedCommandWith(DescribeSecurityGroupsCommand, {
                Filters: [
                    { Name: 'group-name', Values: ["test-server-123"] },
                    { Name: 'vpc-id', Values: ["vpc-12345"] }
                ]
            });
            expect(ec2ClientMock).toHaveReceivedCommandWith(DeleteSecurityGroupCommand, {
                GroupId: "sg-12345"
            });
        });

        it("handles security group not found gracefully", async () => {
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: []
            });

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            expect(ec2ClientMock).toHaveReceivedCommand(DescribeSecurityGroupsCommand);
            expect(ec2ClientMock).not.toHaveReceivedCommand(DeleteSecurityGroupCommand);
        });

        it("handles InvalidGroup.NotFound error during deletion (idempotent)", async () => {
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            // Group was already deleted by the time we try to delete it
            ec2ClientMock.on(DeleteSecurityGroupCommand).rejects({
                Code: 'InvalidGroup.NotFound',
                message: 'The specified security group does not exist'
            });

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            await expect(service.delete("test-server-123", Region.US_EAST_1_BUE_1)).resolves.not.toThrow();
            
            expect(vi.mocked(mockTracingService.logOperationSuccess)).toHaveBeenCalledWith(
                expect.stringContaining('Security group not found during deletion'),
                "test-server-123",
                Region.US_EAST_1_BUE_1,
                expect.objectContaining({ securityGroupId: "sg-12345" })
            );
        });

        it("retries deletion when DependencyViolation error occurs", async () => {
            // Given: Use fake timers to avoid real delays
            vi.useFakeTimers();
            
            // Security group exists but initially has dependency error
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            // First two attempts fail with DependencyViolation, third succeeds
            ec2ClientMock.on(DeleteSecurityGroupCommand)
                .rejectsOnce({
                    name: 'DependencyViolation',
                    message: 'resource sg-12345 has a dependent object',
                    Code: 'DependencyViolation'
                })
                .rejectsOnce({
                    name: 'DependencyViolation',
                    message: 'resource sg-12345 has a dependent object',
                    Code: 'DependencyViolation'
                })
                .resolvesOnce({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            // When: Start the deletion and advance timers
            const deletePromise = service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            // Advance timers to trigger retries (5000ms delay between attempts)
            await vi.advanceTimersByTimeAsync(5000);
            await vi.advanceTimersByTimeAsync(5000);
            
            await deletePromise;
            
            // Then: Should have attempted delete 3 times
            expect(ec2ClientMock).toHaveReceivedCommandTimes(DeleteSecurityGroupCommand, 3);
            expect(mockTracingService.logOperationStart).toHaveBeenCalledWith(
                expect.stringContaining('Security group deletion failed due to dependency'),
                "test-server-123",
                Region.US_EAST_1_BUE_1,
                expect.objectContaining({
                    securityGroupId: "sg-12345",
                    errorMessage: expect.any(String)
                })
            );
        });

        it("succeeds on first attempt when no dependency error", async () => {
            // Given: Security group exists and can be deleted immediately
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            ec2ClientMock.on(DeleteSecurityGroupCommand).resolvesOnce({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            // When
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            // Then: Should have attempted delete only once
            expect(ec2ClientMock).toHaveReceivedCommandTimes(DeleteSecurityGroupCommand, 1);
        });

        it("throws error after max retries with DependencyViolation", async () => {
            // Given: Use fake timers to avoid real delays
            vi.useFakeTimers();
            
            // Security group exists but always has dependency error
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            // All attempts fail with DependencyViolation
            ec2ClientMock.on(DeleteSecurityGroupCommand).rejects({
                name: 'DependencyViolation',
                message: 'resource sg-12345 has a dependent object',
                Code: 'DependencyViolation'
            });

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            // When: Start the deletion and set up the expectation before advancing timers
            const deletePromise = service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            // Catch the rejection to prevent unhandled promise rejection
            deletePromise.catch(() => {});
            
            // Advance timers for all 10 attempts (9 delays of 5000ms each)
            for (let i = 0; i < 29; i++) {
                await vi.advanceTimersByTimeAsync(5000);
            }

            // Then: Should throw after max retries (30 attempts)
            await expect(deletePromise).rejects.toThrow('Failed to delete security group sg-12345 after 30 attempts');

            expect(ec2ClientMock).toHaveReceivedCommandTimes(DeleteSecurityGroupCommand, 30);
        });

        it("throws immediately on non-dependency errors without retrying", async () => {
            // Given: Security group exists but deletion fails with non-dependency error
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            ec2ClientMock.on(DeleteSecurityGroupCommand).rejects({
                name: 'AccessDenied',
                message: 'User is not authorized to perform DeleteSecurityGroup',
                Code: 'AccessDenied'
            });

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            // When/Then: Should throw immediately without retrying
            await expect(service.delete("test-server-123", Region.US_EAST_1_BUE_1))
                .rejects.toThrow('User is not authorized to perform DeleteSecurityGroup');
            
            expect(ec2ClientMock).toHaveReceivedCommandTimes(DeleteSecurityGroupCommand, 1);
        });

        it("handles various DependencyViolation error formats", async () => {
            // Given: Use fake timers to avoid real delays
            vi.useFakeTimers();
            
            // Security group exists
            ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
                SecurityGroups: [{
                    GroupId: "sg-12345"
                }]
            });

            // Test different error formats that should all be recognized as dependency errors
            ec2ClientMock.on(DeleteSecurityGroupCommand)
                .rejectsOnce({
                    name: 'DependencyViolation',
                    message: 'error message'
                })
                .rejectsOnce({
                    Code: 'DependencyViolation',
                    message: 'error message'
                })
                .rejectsOnce({
                    message: 'resource has a dependent object'
                })
                .resolvesOnce({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            // When: Start the deletion and advance timers
            const deletePromise = service.delete("test-server-123", Region.US_EAST_1_BUE_1);
            
            // Advance timers for 3 retry delays
            await vi.advanceTimersByTimeAsync(5000);
            await vi.advanceTimersByTimeAsync(5000);
            await vi.advanceTimersByTimeAsync(5000);
            
            await deletePromise;
            
            // Then: Should have retried for all dependency error formats
            expect(ec2ClientMock).toHaveReceivedCommandTimes(DeleteSecurityGroupCommand, 4);
        });
    });
});
