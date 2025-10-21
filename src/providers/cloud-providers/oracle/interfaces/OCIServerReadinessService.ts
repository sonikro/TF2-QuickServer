export interface OCIServerReadinessService {
    waitForReady(params: {
        publicIp: string;
        rconPassword: string;
        serverId: string;
        signal: AbortSignal;
    }): Promise<string>;
}
