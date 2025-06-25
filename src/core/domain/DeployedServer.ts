import { Region } from "./Region";
import { Variant } from "./Variant";

export type ServerStatus = "pending" | "ready";
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
    status?: ServerStatus;
    logSecret?: number;
}