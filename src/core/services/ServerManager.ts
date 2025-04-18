import { Variant, Server, Region} from "../domain";

export interface ServerManager {
    /**
     * Deploys a new TF2 server in the selected region with a specific variant.
     */
    deployServer(args: {region: Region, variantName: Variant, sourcemodAdminSteamId?: string }): Promise<Server>;

    /**
     * Deletes an existing TF2 server.
     */
    deleteServer(args: {serverId: string, region: Region}): Promise<void>;
}
