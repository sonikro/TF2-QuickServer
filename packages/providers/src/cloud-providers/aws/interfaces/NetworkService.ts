import { Region } from "@tf2qs/core/src/domain";

export interface NetworkService {
    /**
     * Retrieves the public IP address from an EC2 instance
     */
    getPublicIp(instanceId: string, region: Region): Promise<string>;
}
