/**
 * Base class for server deployment results. All Server Providers must return at least these fields
 */
export class ServerDeploymentResult {
    public readonly serverId: string;
    public readonly publicIp: string;
    public readonly rconPassword: string;
    public readonly serverPassword: string;
    public readonly tvPassword: string;
    public readonly sdrAddress: string;

    constructor(data: {
        serverId: string;
        publicIp: string;
        rconPassword: string;
        serverPassword: string;
        tvPassword: string;
        sdrAddress: string;
    }) {
        this.serverId = data.serverId;
        this.publicIp = data.publicIp;
        this.rconPassword = data.rconPassword;
        this.serverPassword = data.serverPassword;
        this.tvPassword = data.tvPassword;
        this.sdrAddress = data.sdrAddress;
    }

    get sdrHost(): string {
        return this.sdrAddress.split(':')[0];
    }

    get sdrPort(): number {
        return Number(this.sdrAddress.split(':')[1]);
    }

    get rconPort(): number {
        return 27015;
    }

    get tvPort(): number {
        return 27020;
    }

}
