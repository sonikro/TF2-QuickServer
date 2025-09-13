import config from "config";

export interface AWSConfig {
    regions: { [key: string]: AWSRegionSettings };
    account_id: string;
}

export interface AWSRegionSettings {
    cluster_name: string;
    subnet_id: string;  // Single subnet for the local zone
    vpc_id: string;     // VPC ID needed for security group creation
    task_execution_role_arn: string;
    task_role_arn: string;
    rootRegion: string; // The root AWS region that contains this Local Zone
}

export function getAWSConfig(): AWSConfig {
    return {
        account_id: process.env.AWS_ACCOUNT_ID || "",
        regions: {
            "us-east-1-bue-1a": {
                cluster_name: config.get<string>(`buenos_aires_cluster_name.value`),
                subnet_id: config.get<string>(`buenos_aires_subnet_id.value`),
                vpc_id: config.get<string>(`buenos_aires_vpc_id.value`),
                task_execution_role_arn: config.get<string>(`buenos_aires_task_execution_role_arn.value`),
                task_role_arn: config.get<string>(`buenos_aires_task_role_arn.value`),
                rootRegion: "us-east-1",
            },
        }
    };
}
