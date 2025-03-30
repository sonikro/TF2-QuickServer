import { Region } from "./Region";
import { Variant } from "./Variant";

export interface DeployedServer {
    serverId: string;
    region: Region;
    variant: Variant;
}