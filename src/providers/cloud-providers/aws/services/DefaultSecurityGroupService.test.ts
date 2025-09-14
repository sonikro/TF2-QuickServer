import { describe, it, expect, vi, beforeEach } from "vitest";
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
            ecsClient: {} as any
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

    describe("create", () => {
        it("creates security group successfully", async () => {
            ec2ClientMock.on(CreateSecurityGroupCommand).resolves({
                GroupId: "sg-12345"
            });

            ec2ClientMock.on(AuthorizeSecurityGroupIngressCommand).resolves({});

            const service = new DefaultSecurityGroupService(mockAWSConfigService, mockTracingService);
            
            const result = await service.create("test-server-123", Region.US_EAST_1_BUE_1A);
            
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
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1A);
            
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
            
            await service.delete("test-server-123", Region.US_EAST_1_BUE_1A);
            
            expect(ec2ClientMock).toHaveReceivedCommand(DescribeSecurityGroupsCommand);
            expect(ec2ClientMock).not.toHaveReceivedCommand(DeleteSecurityGroupCommand);
        });
    });
});
