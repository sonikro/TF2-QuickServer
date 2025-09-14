/**
 * Immutable value object containing the result of a successful server deployment
 */
export class ServerDeploymentResult {
    public readonly serverId: string;
    public readonly publicIp: string;
    public readonly rconPassword: string;
    public readonly serverPassword: string;
    public readonly tvPassword: string;
    public readonly sdrAddress: string;
    public readonly instanceId: string;
    public readonly securityGroupId: string;
    public readonly taskDefinitionArn: string;
    public readonly serviceArn: string;
    public readonly success: boolean;
    public readonly message: string;
    public readonly error?: Error;

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
        this.serverId = data.serverId;
        this.publicIp = data.publicIp;
        this.rconPassword = data.rconPassword;
        this.serverPassword = data.serverPassword;
        this.tvPassword = data.tvPassword;
        this.sdrAddress = data.sdrAddress;
        this.instanceId = data.instanceId;
        this.securityGroupId = data.securityGroupId;
        this.taskDefinitionArn = data.taskDefinitionArn;
        this.serviceArn = data.serviceArn;
        this.success = data.success ?? true;
        this.message = data.message ?? 'Server deployed successfully';
        this.error = data.error;
    }

    /**
     * Creates a failed deployment result
     */
    static failed(data: {
        serverId: string;
        error: Error;
        message?: string;
    }): ServerDeploymentResult {
        return new ServerDeploymentResult({
            serverId: data.serverId,
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
            message: data.message ?? 'Server deployment failed',
            error: data.error
        });
    }
}
