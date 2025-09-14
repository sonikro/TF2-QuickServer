import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
    EC2Client,
    DescribeImagesCommand,
    DescribeInstancesCommand,
    RunInstancesCommand,
    TerminateInstancesCommand,
    waitUntilInstanceRunning,
    _InstanceType
} from "@aws-sdk/client-ec2";
import { Region, VariantConfig } from "../../../../core/domain";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { AWSConfigService } from "./AWSConfigService";
import { DefaultEC2InstanceService } from "./DefaultEC2InstanceService";

vi.mock("@aws-sdk/client-ec2", async () => {
    const actual = await vi.importActual("@aws-sdk/client-ec2");
    return {
        ...actual,
        waitUntilInstanceRunning: vi.fn()
    };
});

const ec2Mock = mockClient(EC2Client);

describe("DefaultEC2InstanceService", () => {
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
        ec2Mock.reset();
        vi.clearAllMocks();
        
        // Setup default mocks
        vi.mocked(mockAWSConfigService.getClients).mockReturnValue({
            ec2Client: ec2Mock as unknown as EC2Client,
            ecsClient: {} as any
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
        const createArgs = {
            serverId: "test-server-123",
            region: Region.US_EAST_1_BUE_1A,
            variantConfig: { ocpu: 1, memory: 4 } as VariantConfig,
            securityGroupId: "sg-12345"
        };

        it("creates EC2 instance successfully", async () => {
            ec2Mock.on(DescribeImagesCommand).resolves({
                Images: [{
                    ImageId: "ami-12345",
                    CreationDate: "2023-01-01T00:00:00.000Z"
                }]
            });

            ec2Mock.on(RunInstancesCommand).resolves({
                Instances: [{
                    InstanceId: "i-12345"
                }]
            });

            vi.mocked(waitUntilInstanceRunning).mockResolvedValue({ $metadata: {} } as any);

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            const result = await service.create(createArgs);
            
            expect(result).toBe("i-12345");
            expect(ec2Mock).toHaveReceivedCommandWith(DescribeImagesCommand, {
                Owners: ['amazon'],
                Filters: expect.arrayContaining([
                    { Name: 'name', Values: ['amzn2-ami-ecs-hvm-2.0.*-x86_64-ebs'] },
                    { Name: 'architecture', Values: ['x86_64'] },
                    { Name: 'state', Values: ['available'] },
                    { Name: 'virtualization-type', Values: ['hvm'] }
                ])
            });
            expect(ec2Mock).toHaveReceivedCommandWith(RunInstancesCommand, {
                ImageId: "ami-12345",
                InstanceType: _InstanceType.t3_medium,
                MinCount: 1,
                MaxCount: 1,
                SecurityGroupIds: ["sg-12345"],
                SubnetId: "subnet-12345",
                UserData: expect.any(String),
                IamInstanceProfile: {
                    Arn: "arn:aws:iam::123456789012:instance-profile/test-profile"
                },
                TagSpecifications: [{
                    ResourceType: "instance",
                    Tags: [
                        { Key: "Name", Value: "test-server-123" },
                        { Key: "Server", Value: "test-server-123" }
                    ]
                }]
            });
        });

        it("validates userData contains all required ECS configuration variables", async () => {
            ec2Mock.on(DescribeImagesCommand).resolves({
                Images: [{
                    ImageId: "ami-12345",
                    CreationDate: "2023-01-01T00:00:00.000Z"
                }]
            });

            let capturedUserData: string | undefined;
            ec2Mock.on(RunInstancesCommand).callsFake((input) => {
                capturedUserData = input.UserData;
                return {
                    Instances: [{
                        InstanceId: "i-12345"
                    }]
                };
            });

            vi.mocked(waitUntilInstanceRunning).mockResolvedValue({ $metadata: {} } as any);

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await service.create(createArgs);
            
            expect(capturedUserData).toBeDefined();
            const decodedUserData = Buffer.from(capturedUserData!, 'base64').toString('utf-8');
            
            // Extract the ECS config section between the heredoc markers
            const ecsConfigMatch = decodedUserData.match(/cat <<'EOF' >> \/etc\/ecs\/ecs\.config\n([\s\S]*?)\nEOF/);
            expect(ecsConfigMatch).toBeTruthy();
            
            const ecsConfig = ecsConfigMatch![1];
            
            // Validate each ECS configuration line
            const expectedEcsConfig = [
                'ECS_CLUSTER=test-cluster',
                'ECS_INSTANCE_ATTRIBUTES={"server-id":"test-server-123"}',
                'ECS_ENABLE_CONTAINER_METADATA=true',
                'ECS_AVAILABLE_LOGGING_DRIVERS=["json-file","awslogs"]',
                'ECS_LOGLEVEL=info',
                'ECS_ENABLE_TASK_IAM_ROLE=true'
            ];
            
            expectedEcsConfig.forEach(configLine => {
                expect(ecsConfig).toContain(configLine);
            });
        });

        it("throws error for unsupported instance type", async () => {
            const invalidArgs = {
                ...createArgs,
                variantConfig: { ocpu: 2, memory: 8 } as VariantConfig
            };

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await expect(service.create(invalidArgs))
                .rejects.toThrowError("Currently only supporting t3_medium instances");
        });

        it("throws error when no AMI found", async () => {
            ec2Mock.on(DescribeImagesCommand).resolves({
                Images: []
            });

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await expect(service.create(createArgs))
                .rejects.toThrowError("No ECS-optimized AMI found");
        });

        it("throws error when instance creation fails", async () => {
            ec2Mock.on(DescribeImagesCommand).resolves({
                Images: [{
                    ImageId: "ami-12345",
                    CreationDate: "2023-01-01T00:00:00.000Z"
                }]
            });

            ec2Mock.on(RunInstancesCommand).resolves({
                Instances: []
            });

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await expect(service.create(createArgs))
                .rejects.toThrowError("Failed to launch EC2 instance");
        });
    });

    describe("terminate", () => {
        it("terminates instance successfully", async () => {
            ec2Mock.on(DescribeInstancesCommand).resolves({
                Reservations: [{
                    Instances: [{
                        InstanceId: "i-12345"
                    }]
                }]
            });

            ec2Mock.on(TerminateInstancesCommand).resolves({});

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await service.terminate("test-server-123", Region.US_EAST_1_BUE_1A);
            
            expect(ec2Mock).toHaveReceivedCommandWith(DescribeInstancesCommand, {
                Filters: [
                    { Name: "tag:Server", Values: ["test-server-123"] },
                    { Name: "instance-state-name", Values: ["running", "pending"] }
                ]
            });
            expect(ec2Mock).toHaveReceivedCommandWith(TerminateInstancesCommand, {
                InstanceIds: ["i-12345"]
            });
        });

        it("handles no running instances gracefully", async () => {
            ec2Mock.on(DescribeInstancesCommand).resolves({
                Reservations: []
            });

            const service = new DefaultEC2InstanceService(mockAWSConfigService, mockTracingService);
            
            await service.terminate("test-server-123", Region.US_EAST_1_BUE_1A);
            
            expect(ec2Mock).toHaveReceivedCommand(DescribeInstancesCommand);
            expect(ec2Mock).not.toHaveReceivedCommand(TerminateInstancesCommand);
        });
    });
});
