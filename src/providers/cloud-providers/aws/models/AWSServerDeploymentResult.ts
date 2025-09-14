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
        success?: boolean;
        message?: string;
        error?: Error;
    }) {
        super({
            serverId: data.serverId,
            publicIp: data.publicIp,
            rconPassword: data.rconPassword,
            serverPassword: data.serverPassword,
            tvPassword: data.tvPassword,
            sdrAddress: data.sdrAddress,
            success: data.success,
            message: data.message,
            error: data.error
        });
        
        this.instanceId = data.instanceId;
        this.securityGroupId = data.securityGroupId;
        this.taskDefinitionArn = data.taskDefinitionArn;
        this.serviceArn = data.serviceArn;
    }

    /**
     * Creates a failed AWS deployment result
     */
    static createFailure(serverId: string, error: Error, message: string): AWSServerDeploymentResult {
        return new AWSServerDeploymentResult({
            serverId,
            publicIp: '',
            rconPassword: '',
            serverPassword: '',
            tvPassword: '',
            sdrAddress: '',
            instanceId: '',
            securityGroupId: '',
            taskDefinitionArn: '',
            serviceArn: '',
            success: false,
            message,
            error
        });
    }
}
