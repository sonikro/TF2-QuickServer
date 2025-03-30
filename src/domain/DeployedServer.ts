import { Region } from "./Region";
import { Variant } from "./Variant";

export interface DeployedServer {
    serverId: string;
    region: Region;
    variant: Variant;
    hostIp: string;
    hostPort: number;
    tvIp: string;
    tvPort: number;
    rconPassword: string;
    hostPassword?: string;
    tvPassword?: string;
}