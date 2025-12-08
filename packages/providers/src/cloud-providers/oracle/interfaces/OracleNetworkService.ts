import { Region } from "@tf2qs/core";

export interface OracleNetworkService {
    createNetworkSecurityGroup(params: {
        serverId: string;
        vcnId: string;
        compartmentId: string;
    }): Promise<string>;

    deleteNetworkSecurityGroup(params: {
        serverId: string;
        region: Region;
        vcnId: string;
        compartmentId: string;
    }): Promise<void>;

    getPublicIp(params: {
        instanceId: string;
        compartmentId: string;
        signal: AbortSignal;
    }): Promise<string>;
}
