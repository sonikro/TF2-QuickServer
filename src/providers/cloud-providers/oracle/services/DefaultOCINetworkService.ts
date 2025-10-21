import { Region } from "../../../../core/domain";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { OCINetworkService } from "../interfaces";
import { OCIConfigService } from "./OCIConfigService";
import { waitUntil } from "../../../utils/waitUntil";

type DefaultOCINetworkServiceDependencies = {
    ociConfigService: OCIConfigService;
    operationTracer: OperationTracingService;
};

export class DefaultOCINetworkService implements OCINetworkService {
    constructor(private readonly dependencies: DefaultOCINetworkServiceDependencies) {}

    async getVnicId(params: { containerId: string; signal: AbortSignal }): Promise<string> {
        const { containerId, signal } = params;
        const { containerClient } = this.dependencies.ociConfigService.getClients({ region: 'us-east-1' as any });

        return await waitUntil(async () => {
            const containerInstance = await containerClient.getContainerInstance({
                containerInstanceId: containerId
            });
            if (containerInstance.containerInstance.vnics[0].vnicId) {
                return containerInstance.containerInstance.vnics[0].vnicId;
            }
            throw new Error("VNIC ID not available yet");
        }, { signal });
    }

    async getPublicIp(params: { vnicId: string; region: Region }): Promise<string> {
        const { vnicId, region } = params;
        return await this.dependencies.operationTracer.executeWithTracing(
            'OCINetworkService.getPublicIp',
            vnicId,
            async () => {
                const { vncClient } = this.dependencies.ociConfigService.getClients({ region });

                this.dependencies.operationTracer.logOperationStart(
                    'Getting public IP',
                    vnicId,
                    region
                );

                const vnicDetails = await vncClient.getVnic({ vnicId });
                const publicIp = vnicDetails.vnic?.publicIp;
                
                if (!publicIp) {
                    throw new Error("Failed to retrieve public IP");
                }

                this.dependencies.operationTracer.logOperationSuccess(
                    'Public IP retrieved',
                    vnicId,
                    region,
                    { publicIp }
                );

                return publicIp;
            }
        );
    }
}
