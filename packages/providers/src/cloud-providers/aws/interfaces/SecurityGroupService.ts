import { Region } from "@tf2qs/core";

export interface SecurityGroupService {
    /**
     * Creates a security group for the TF2 server with necessary rules
     */
    create(serverId: string, region: Region): Promise<string>;

    /**
     * Deletes the security group for the TF2 server
     */
    delete(serverId: string, region: Region): Promise<void>;
}
