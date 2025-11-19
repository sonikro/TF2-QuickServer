import { TF2ServerReadinessService } from '@tf2qs/core';
import { ServerCommander } from '@tf2qs/core';
import { ServerStatusParser } from '@tf2qs/core';
import { waitUntil } from "../utils/waitUntil";
import { logger } from '@tf2qs/telemetry';

/**
 * Default implementation of TF2ServerReadinessService
 * This is a generic service that can be used by any cloud provider (AWS, OCI, etc.)
 */
export class DefaultTF2ServerReadinessService implements TF2ServerReadinessService {
    constructor(private readonly serverCommander: ServerCommander) {}
    
    async waitForReady(
        publicIp: string,
        rconPassword: string,
        serverId: string,
        abortSignal?: AbortSignal
    ): Promise<string> {
        logger.emit({ 
            severityText: 'INFO', 
            body: `Waiting for TF2 server to be ready: ${serverId}`, 
            attributes: { serverId, publicIp } 
        });

        const result = await waitUntil<{ sdrAddress: string }>(
            async () => {
                const result = await this.serverCommander.query({
                    command: "status",
                    host: publicIp,
                    password: rconPassword,
                    port: 27015,
                    timeout: 5000,
                });

                const serverStatus = new ServerStatusParser(result);

                if (!serverStatus.sourceTVIp) {
                    throw new Error("Server is not ready yet");
                }

                return {
                    sdrAddress: `${serverStatus.serverIp}:${serverStatus.serverPort}`,
                };
            },
            {
                timeout: 180000,
                interval: 5000,
                signal: abortSignal
            }
        );

        logger.emit({ 
            severityText: 'INFO', 
            body: `TF2 server is ready: ${serverId}`, 
            attributes: { 
                serverId, 
                publicIp, 
                sdrAddress: result.sdrAddress 
            } 
        });

        return result.sdrAddress;
    }
}
