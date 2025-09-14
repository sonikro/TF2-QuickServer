import { ServerDeploymentResult } from '../../../../core/models/ServerDeploymentResult';

/**
 * AWS-specific server deployment result containing ECS and EC2 specific information
 */
export class AWSServerDeploymentResult extends ServerDeploymentResult {
    public readonly instanceId: string;
    public readonly securityGroupId: string;
    public readonly taskDefinitionArn: string;
    public readonly serviceArn: string;

    constructor(data: {
        serverId: string;
        publicIp: string;
        rconPassword: string;
        serverPassword: string;
        tvPassword: string;
        sdrAddress: string;
        instanceId: string;
        securityGroupId: string;
        taskDefinitionArn: string;
        serviceArn: string;
    }) {
        super({
            serverId: data.serverId,
            publicIp: data.publicIp,
            rconPassword: data.rconPassword,
            serverPassword: data.serverPassword,
            tvPassword: data.tvPassword,
            sdrAddress: data.sdrAddress,
        });
        
        this.instanceId = data.instanceId;
        this.securityGroupId = data.securityGroupId;
        this.taskDefinitionArn = data.taskDefinitionArn;
        this.serviceArn = data.serviceArn;
    }

}
