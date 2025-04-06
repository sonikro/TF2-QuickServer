import { Region } from "./Region";
import { Variant } from "./Variant";

export interface Server {
    serverId: string;
    region: Region;
    variant: Variant;
    hostIp: string;
    hostPort: number;
    tvIp: string;
    tvPort: number;
    rconPassword: string;
    hostPassword?: string;
    rconAddress: string;
    tvPassword?: string;
    createdAt?: Date;
    createdBy?: string;
}