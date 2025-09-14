/**
 * Immutable value object representing network configuration for ECS deployment
 */
export class NetworkConfiguration {
    public readonly subnets: string[];
    public readonly securityGroups: string[];
    public readonly assignPublicIp: boolean;

    constructor(data: {
        subnets: string[];
        securityGroups: string[];
        assignPublicIp?: boolean;
    }) {
        this.subnets = data.subnets;
        this.securityGroups = data.securityGroups;
        this.assignPublicIp = data.assignPublicIp ?? true;
    }
}
