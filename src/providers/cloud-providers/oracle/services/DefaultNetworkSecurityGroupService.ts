import { Region } from "../../../../core/domain";
import { logger } from "../../../../telemetry/otel";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { NetworkSecurityGroupService } from "../interfaces";
import { OCIConfigService } from "./OCIConfigService";
import { waitUntil } from "../../../utils/waitUntil";

type DefaultNetworkSecurityGroupServiceDependencies = {
    ociConfigService: OCIConfigService;
    operationTracer: OperationTracingService;
};

export class DefaultNetworkSecurityGroupService implements NetworkSecurityGroupService {
    constructor(private readonly dependencies: DefaultNetworkSecurityGroupServiceDependencies) {}

    async create(params: { serverId: string; region: Region }): Promise<string> {
        const { serverId, region } = params;
        return await this.dependencies.operationTracer.executeWithTracing(
            'NetworkSecurityGroupService.create',
            serverId,
            async () => {
                const { vncClient } = this.dependencies.ociConfigService.getClients({ region });
                const regionConfig = this.dependencies.ociConfigService.getOracleRegionConfig({ region });

                this.dependencies.operationTracer.logOperationStart(
                    'Creating network security group',
                    serverId,
                    region
                );

                const nsgResponse = await vncClient.createNetworkSecurityGroup({
                    createNetworkSecurityGroupDetails: {
                        compartmentId: regionConfig.compartment_id,
                        vcnId: regionConfig.vnc_id,
                        displayName: serverId,
                    }
                });

                const nsgId = nsgResponse.networkSecurityGroup?.id;
                if (!nsgId) {
                    throw new Error("Failed to create NSG");
                }

                for (const protocol of ["6", "17"]) {
                    await vncClient.addNetworkSecurityGroupSecurityRules({
                        networkSecurityGroupId: nsgId,
                        addNetworkSecurityGroupSecurityRulesDetails: {
                            securityRules: [
                                {
                                    direction: "INGRESS" as any,
                                    protocol,
                                    source: "0.0.0.0/0",
                                    sourceType: "CIDR_BLOCK" as any,
                                    tcpOptions: protocol === "6" ? { destinationPortRange: { min: 27015, max: 27020 } } : undefined,
                                    udpOptions: protocol === "17" ? { destinationPortRange: { min: 27015, max: 27020 } } : undefined,
                                }
                            ]
                        }
                    });
                }

                this.dependencies.operationTracer.logOperationSuccess(
                    'Network security group created',
                    serverId,
                    region,
                    { nsgId }
                );

                return nsgId;
            }
        );
    }

    async delete(params: { serverId: string; region: Region }): Promise<void> {
        const { serverId, region } = params;
        await this.dependencies.operationTracer.executeWithTracing(
            'NetworkSecurityGroupService.delete',
            serverId,
            async () => {
                const { vncClient } = this.dependencies.ociConfigService.getClients({ region });
                const regionConfig = this.dependencies.ociConfigService.getOracleRegionConfig({ region });

                this.dependencies.operationTracer.logOperationStart(
                    'Deleting network security group',
                    serverId,
                    region
                );

                const nsgs = await vncClient.listNetworkSecurityGroups({
                    compartmentId: regionConfig.compartment_id,
                    displayName: serverId,
                    vcnId: regionConfig.vnc_id,
                });

                if (!nsgs.items || nsgs.items.length === 0) {
                    logger.emit({
                        severityText: 'WARN',
                        body: `No NSG found for server ID: ${serverId}`,
                        attributes: { serverId, region }
                    });
                    return;
                }

                const nsgId = nsgs.items[0].id;

                await waitUntil(async () => {
                    const vnicsResp = await vncClient.listNetworkSecurityGroupVnics({ networkSecurityGroupId: nsgId });
                    if (!vnicsResp.items || vnicsResp.items.length === 0) {
                        return true;
                    }
                    throw new Error("NSG still has associated VNICs");
                }, { interval: 5000, timeout: 300000 });

                await vncClient.deleteNetworkSecurityGroup({ networkSecurityGroupId: nsgId });

                this.dependencies.operationTracer.logOperationSuccess(
                    'Network security group deleted',
                    serverId,
                    region,
                    { nsgId }
                );
            }
        );
    }
}
