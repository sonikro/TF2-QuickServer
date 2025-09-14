/**
 * Base interface for server deployment results containing cloud-agnostic information
 */
export interface BaseServerDeploymentResult {
    readonly serverId: string;
    readonly publicIp: string;
    readonly rconPassword: string;
    readonly serverPassword: string;
    readonly tvPassword: string;
    readonly sdrAddress: string;
    readonly success: boolean;
    readonly message: string;
    readonly error?: Error;
}

/**
 * Abstract base class for server deployment results
 */
export abstract class ServerDeploymentResult implements BaseServerDeploymentResult {
    public readonly serverId: string;
    public readonly publicIp: string;
    public readonly rconPassword: string;
    public readonly serverPassword: string;
    public readonly tvPassword: string;
    public readonly sdrAddress: string;
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
        this.success = data.success ?? true;
        this.message = data.message ?? 'Server deployed successfully';
        this.error = data.error;
    }

    /**
     * Creates a failed deployment result
     */
    static createFailure(serverId: string, error: Error, message: string): ServerDeploymentResult {
        // This method should be overridden by concrete implementations
        throw new Error('createFailure must be implemented by concrete classes');
    }
}
