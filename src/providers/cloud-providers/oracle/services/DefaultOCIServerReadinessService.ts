import { ServerCommander } from "../../../../core/services/ServerCommander";
import { ServerStatus } from "../../../../core/domain/ServerStatus";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { OCIServerReadinessService } from "../interfaces";
import { waitUntil } from "../../../utils/waitUntil";
import { logger } from "../../../../telemetry/otel";

type DefaultOCIServerReadinessServiceDependencies = {
    serverCommander: ServerCommander;
    operationTracer: OperationTracingService;
};

export class DefaultOCIServerReadinessService implements OCIServerReadinessService {
    constructor(private readonly dependencies: DefaultOCIServerReadinessServiceDependencies) {}

    async waitForReady(params: {
        publicIp: string;
        rconPassword: string;
        serverId: string;
        signal: AbortSignal;
    }): Promise<string> {
        const { publicIp, rconPassword, serverId, signal } = params;
        return await this.dependencies.operationTracer.executeWithTracing(
            'OCIServerReadinessService.waitForReady',
            serverId,
            async () => {
                logger.emit({
                    severityText: 'INFO',
                    body: `Waiting for server ${serverId} to be ready to receive RCON commands...`,
                    attributes: { serverId, publicIp }
                });

                const result = await waitUntil<{ sdrAddress: string }>(
                    async () => {
                        const commandResult = await this.dependencies.serverCommander.query({
                            command: "status",
                            host: publicIp,
                            password: rconPassword,
                            port: 27015,
                            timeout: 5000,
                        });
                        const serverStatus = new ServerStatus(commandResult);
                        if (!serverStatus.sourceTVIp) {
                            throw new Error("Server is not ready yet");
                        }
                        return {
                            sdrAddress: `${serverStatus.serverIp}:${serverStatus.serverPort}`,
                        };
                    },
                    {
                        timeout: 360000,
                        interval: 5000,
                        signal,
                    }
                );

                logger.emit({
                    severityText: 'INFO',
                    body: `Server ${serverId} is ready with SDR address: ${result.sdrAddress}`,
                    attributes: { serverId, sdrAddress: result.sdrAddress }
                });

                return result.sdrAddress;
            }
        );
    }
}
