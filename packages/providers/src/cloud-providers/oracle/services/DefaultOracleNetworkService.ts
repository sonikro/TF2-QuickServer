import { logger } from '@tf2qs/telemetry';
import { core } from "oci-sdk";
import { Region } from "@tf2qs/core";
import { OracleNetworkService } from '../interfaces';
import { waitUntil } from "../../../utils/waitUntil";

type DefaultOracleNetworkServiceDependencies = {
    vncClient: core.VirtualNetworkClient;
    computeClient: core.ComputeClient;
};

export class DefaultOracleNetworkService implements OracleNetworkService {
    constructor(private readonly dependencies: DefaultOracleNetworkServiceDependencies) {}

    async createNetworkSecurityGroup(params: {
        serverId: string;
        vcnId: string;
        compartmentId: string;
    }): Promise<string> {
        const { serverId, vcnId, compartmentId } = params;
        const { vncClient } = this.dependencies;

        logger.emit({
            severityText: 'INFO',
            body: `Creating network security group for server ID: ${serverId}`,
            attributes: { serverId }
        });

        const nsgResponse = await vncClient.createNetworkSecurityGroup({
            createNetworkSecurityGroupDetails: {
                compartmentId: compartmentId,
                vcnId: vcnId,
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

        return nsgId;
    }

    async deleteNetworkSecurityGroup(params: {
        serverId: string;
        region: Region;
        vcnId: string;
        compartmentId: string;
    }): Promise<void> {
        const { serverId, vcnId, compartmentId } = params;
        const { vncClient } = this.dependencies;

        logger.emit({
            severityText: 'INFO',
            body: `Looking up network security group for server ID: ${serverId}`,
            attributes: { serverId }
        });

        const nsgs = await vncClient.listNetworkSecurityGroups({
            compartmentId: compartmentId,
            displayName: serverId,
            vcnId: vcnId,
        });

        if (!nsgs.items || nsgs.items.length === 0) {
            logger.emit({
                severityText: 'INFO',
                body: `No network security group found for server ID: ${serverId}`,
                attributes: { serverId }
            });
            return;
        }

        const nsgId = nsgs.items[0].id;

        logger.emit({
            severityText: 'INFO',
            body: `Deleting network security group with ID: ${nsgId} for server ID: ${serverId}`,
            attributes: { serverId, nsgId }
        });

        await waitUntil(async () => {
            const vnicsResp = await vncClient.listNetworkSecurityGroupVnics({ networkSecurityGroupId: nsgId });
            if (!vnicsResp.items || vnicsResp.items.length === 0) {
                return true;
            }
            throw new Error("NSG still has associated VNICs");
        }, { interval: 5000, timeout: 300000 });

        await vncClient.deleteNetworkSecurityGroup({ networkSecurityGroupId: nsgId });

        logger.emit({
            severityText: 'INFO',
            body: `Network security group deleted for server ID: ${serverId}`,
            attributes: { serverId, nsgId }
        });
    }

    async getPublicIp(params: {
        instanceId: string;
        compartmentId: string;
        signal: AbortSignal;
    }): Promise<string> {
        const { instanceId, compartmentId, signal } = params;
        const { vncClient, computeClient } = this.dependencies;

        logger.emit({
            severityText: 'INFO',
            body: `Looking up VNIC attachment for instance ID: ${instanceId}`,
            attributes: { instanceId }
        });

        const vnicId = await waitUntil(async () => {
            const vnicAttachments = await computeClient.listVnicAttachments({
                compartmentId: compartmentId,
                instanceId: instanceId
            });

            if (vnicAttachments.items && vnicAttachments.items.length > 0 && vnicAttachments.items[0].vnicId) {
                return vnicAttachments.items[0].vnicId;
            }

            throw new Error("VNIC not available yet");
        }, { signal });

        logger.emit({
            severityText: 'INFO',
            body: `Retrieving public IP for VNIC ID: ${vnicId}`,
            attributes: { instanceId, vnicId }
        });

        const vnicDetails = await vncClient.getVnic({ vnicId });
        const publicIp = vnicDetails.vnic?.publicIp;

        if (!publicIp) {
            throw new Error(`Failed to retrieve public IP for instance ${instanceId}`);
        }

        logger.emit({
            severityText: 'INFO',
            body: `Public IP retrieved for instance ID: ${instanceId}`,
            attributes: { instanceId, vnicId, publicIp }
        });

        return publicIp;
    }
}
