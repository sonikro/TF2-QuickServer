import { Region, Variant } from "../domain";
import { StatusUpdater } from "../services/StatusUpdater";

/**
 * Immutable value object containing all context needed for server deployment
 */
export class DeploymentContext {
    constructor({
        serverId,
        region,
        variantName,
        firstMap,
        statusUpdater,
        sourcemodAdminSteamId,
        extraEnvs = {}
    }: {
        serverId: string;
        region: Region;
        variantName: Variant;
        firstMap?: string;
        statusUpdater: StatusUpdater;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }) {
        this.serverId = serverId;
        this.region = region;
        this.variantName = variantName;
        this.firstMap = firstMap;
        this.statusUpdater = statusUpdater;
        this.sourcemodAdminSteamId = sourcemodAdminSteamId;
        this.extraEnvs = extraEnvs;
    }

    public readonly serverId: string;
    public readonly region: Region;
    public readonly variantName: Variant;
    public readonly firstMap?: string;
    public readonly statusUpdater: StatusUpdater;
    public readonly sourcemodAdminSteamId?: string;
    public readonly extraEnvs: Record<string, string>;

    /**
     * Gets the UUID prefix from serverId for hostname
     */
    get uuidPrefix(): string {
        return this.serverId.split('-')[0];
    }
}
