import { EC2Client } from "@aws-sdk/client-ec2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { EFSClient } from "@aws-sdk/client-efs";
import { STSClient } from "@aws-sdk/client-sts";
import { AWSServiceFactory } from "../../core/services/AWSServiceFactory";

export const defaultAwsServiceFactory: AWSServiceFactory = (args) => {
    const { region } = args;
    return {
        ecsClient: new ECSClient({ region }),
        efsClient: new EFSClient({ region }),
        ec2Client: new EC2Client({ region }),
        stsClient: new STSClient({ region })
    };
}