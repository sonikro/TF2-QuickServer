import { Region } from "../../../../core/domain";

export interface OCINetworkService {
    getVnicId(params: { containerId: string; signal: AbortSignal }): Promise<string>;
    
    getPublicIp(params: { vnicId: string; region: Region }): Promise<string>;
}
