import config from "config";

export interface AWSConfig {
    regions: { [key: string]: AWSRegionSettings };
}

export interface AWSRegionSettings {
    cluster_name: string;
    subnet_id: string;  // Single subnet for the local zone
    vpc_id: string;     // VPC ID needed for security group creation
    task_execution_role_arn: string;
    task_role_arn: string;
    instance_profile_arn: string; // IAM instance profile for EC2 instances
    log_group_name: string; // CloudWatch log group for ECS containers
    rootRegion: string; // The root AWS region that contains this Local Zone
}

export function getAWSConfig(): AWSConfig {
    return {
        regions: {
            "us-east-1-bue-1": {
                cluster_name: config.get<string>(`buenos_aires_cluster_name.value`),
                subnet_id: config.get<string>(`buenos_aires_subnet_id.value`),
                vpc_id: config.get<string>(`buenos_aires_vpc_id.value`),
                task_execution_role_arn: config.get<string>(`buenos_aires_task_execution_role_arn.value`),
                task_role_arn: config.get<string>(`buenos_aires_task_role_arn.value`),
                instance_profile_arn: config.get<string>(`buenos_aires_instance_profile_arn.value`),
                log_group_name: config.get<string>(`buenos_aires_log_group_name.value`),
                rootRegion: "us-east-1",
            },
            "us-east-1-lim-1": {
                cluster_name: config.get<string>(`lima_cluster_name.value`),
                subnet_id: config.get<string>(`lima_subnet_id.value`),
                vpc_id: config.get<string>(`lima_vpc_id.value`),
                task_execution_role_arn: config.get<string>(`lima_task_execution_role_arn.value`),
                task_role_arn: config.get<string>(`lima_task_role_arn.value`),
                instance_profile_arn: config.get<string>(`lima_instance_profile_arn.value`),
                log_group_name: config.get<string>(`lima_log_group_name.value`),
                rootRegion: "us-east-1",
            }
        }
    };
}
