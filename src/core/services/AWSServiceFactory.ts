import { EC2Client } from "@aws-sdk/client-ec2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { EFSClient } from "@aws-sdk/client-efs";
import { STSClient } from "@aws-sdk/client-sts";

export type AWSServiceFactory = (args: { region: string }) => {
    ecsClient: ECSClient,
    efsClient: EFSClient,
    ec2Client: EC2Client,
    stsClient: STSClient
};

