/**
 * Service responsible for monitoring TF2 server readiness
 * This is a generic service that can be used by any cloud provider (AWS, OCI, etc.)
 */
export interface TF2ServerReadinessService {
    /**
     * Waits for the TF2 server to be ready and returns SDR address
     */
    waitForReady(
        publicIp: string,
        rconPassword: string,
        serverId: string,
        abortSignal?: AbortSignal
    ): Promise<string>;
}
