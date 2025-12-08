import { Region, OracleRegionSettings } from "@tf2qs/core";
import { core } from "oci-sdk";

export interface OracleComputeService {
    launchInstance(params: {
        serverId: string;
        region: Region;
        variantShape: string;
        variantOcpu: number;
        variantMemory: number;
        imageId: string;
        nsgId: string;
        userDataBase64: string;
        oracleRegionConfig: OracleRegionSettings;
    }): Promise<string>;

    terminateInstance(params: {
        serverId: string;
        region: Region;
    }): Promise<void>;

    waitForInstanceRunning(params: {
        instanceId: string;
        region: Region;
        signal: AbortSignal;
    }): Promise<void>;

    getLatestImage(params: {
        region: Region;
        compartmentId: string;
        displayName: string;
    }): Promise<string>;
}
