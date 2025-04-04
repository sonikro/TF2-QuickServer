import config from "config";

export type CdkConfig = {
    ecsClusterName: string;
    vpcName: string;
    sgName: string;
    efsName: string;
    ecsTaskExecutionRoleName: string;
}

export function getCdkConfig(): CdkConfig {
    const cdkConfig = config.get<CdkConfig>("aws.cdk");
    return cdkConfig;
}