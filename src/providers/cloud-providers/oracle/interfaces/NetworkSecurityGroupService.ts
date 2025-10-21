import { Region } from "../../../../core/domain";

export interface NetworkSecurityGroupService {
    create(params: { serverId: string; region: Region }): Promise<string>;
    delete(params: { serverId: string; region: Region }): Promise<void>;
}
