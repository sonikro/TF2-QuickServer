type OCIServerDeploymentResultParams = {
    serverId: string;
    publicIp: string;
    rconPassword: string;
    serverPassword: string;
    tvPassword: string;
    sdrAddress: string;
    containerId: string;
    nsgId: string;
    logSecret?: number;
};

export class OCIServerDeploymentResult {
    readonly serverId: string;
    readonly publicIp: string;
    readonly rconPassword: string;
    readonly serverPassword: string;
    readonly tvPassword: string;
    readonly sdrAddress: string;
    readonly containerId: string;
    readonly nsgId: string;
    readonly logSecret?: number;

    constructor(params: OCIServerDeploymentResultParams) {
        this.serverId = params.serverId;
        this.publicIp = params.publicIp;
        this.rconPassword = params.rconPassword;
        this.serverPassword = params.serverPassword;
        this.tvPassword = params.tvPassword;
        this.sdrAddress = params.sdrAddress;
        this.containerId = params.containerId;
        this.nsgId = params.nsgId;
        this.logSecret = params.logSecret;
    }

    get sdrHost(): string {
        return this.sdrAddress.split(':')[0];
    }

    get sdrPort(): number {
        return Number(this.sdrAddress.split(':')[1]);
    }

    get tvPort(): number {
        return 27020;
    }
}
