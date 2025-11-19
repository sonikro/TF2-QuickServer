import { Variant, Server, Region } from "../domain";
import { StatusUpdater } from "./StatusUpdater";

export interface ServerManager {
    /**
     * Deploys a new TF2 server in the selected region with a specific variant.
     */
    deployServer(args: {
        serverId: string,
        region: Region,
        variantName: Variant,
        statusUpdater: StatusUpdater,
        sourcemodAdminSteamId?: string,
        extraEnvs?: Record<string, string>,
    }): Promise<Server>;

    /**
     * Deletes an existing TF2 server.
     */
    deleteServer(args: { serverId: string, region: Region }): Promise<void>;
}
