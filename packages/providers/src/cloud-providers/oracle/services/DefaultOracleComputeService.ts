import { logger } from '@tf2qs/telemetry';
import { core } from "oci-sdk";
import { Region, OracleRegionSettings } from "@tf2qs/core";
import { OracleComputeService } from '../interfaces';
import { ConfigManager } from "@tf2qs/core";
import { waitUntil } from "../../../utils/waitUntil";

type DefaultOracleComputeServiceDependencies = {
    configManager: ConfigManager;
    ociClientFactory: (region: Region) => { computeClient: core.ComputeClient, vncClient: core.VirtualNetworkClient };
};

export class DefaultOracleComputeService implements OracleComputeService {
    constructor(private readonly dependencies: DefaultOracleComputeServiceDependencies) {}

    async launchInstance(params: {
        serverId: string;
        region: Region;
        variantShape: string;
        variantOcpu: number;
        variantMemory: number;
        imageId: string;
        nsgId: string;
        userDataBase64: string;
        oracleRegionConfig: OracleRegionSettings;
    }): Promise<string> {
        const { serverId, region, variantShape, variantOcpu, variantMemory, imageId, nsgId, userDataBase64, oracleRegionConfig } = params;
        const { computeClient } = this.dependencies.ociClientFactory(region);

        logger.emit({
            severityText: 'INFO',
            body: `Creating VM instance for server ID: ${serverId}`,
            attributes: { serverId }
        });

        const launchInstanceResponse = await computeClient.launchInstance({
            launchInstanceDetails: {
                compartmentId: oracleRegionConfig.compartment_id,
                availabilityDomain: oracleRegionConfig.availability_domain,
                shape: variantShape,
                shapeConfig: {
                    ocpus: variantOcpu,
                    memoryInGBs: variantMemory
                },
                displayName: serverId,
                imageId: imageId,
                createVnicDetails: {
                    assignPublicIp: true,
                    subnetId: oracleRegionConfig.subnet_id,
                    displayName: `vnic-${serverId}`,
                    nsgIds: [nsgId]
                },
                metadata: {
                    ssh_authorized_keys: process.env.SSH_PUBLIC_KEY || "",
                    user_data: userDataBase64
                }
            }
        });

        const instanceId = launchInstanceResponse.instance?.id;
        if (!instanceId) {
            throw new Error("Failed to create VM instance");
        }

        logger.emit({
            severityText: 'INFO',
            body: `VM instance created with ID: ${instanceId}`,
            attributes: { serverId, instanceId }
        });

        return instanceId;
    }

    async terminateInstance(params: {
        serverId: string;
        region: Region;
    }): Promise<void> {
        const { serverId, region } = params;
        const { computeClient } = this.dependencies.ociClientFactory(region);

        const oracleConfig = this.dependencies.configManager.getOracleConfig();
        const oracleRegionConfig = oracleConfig.regions[region];
        if (!oracleRegionConfig) {
            throw new Error(`Region ${region} is not configured in Oracle config`);
        }

        const instances = await computeClient.listInstances({
            compartmentId: oracleRegionConfig.compartment_id,
            displayName: serverId,
        });

        if (!instances.items || instances.items.length === 0) {
            logger.emit({
                severityText: 'INFO',
                body: `No VM instance found for serverId: ${serverId}, skipping termination`,
                attributes: { serverId }
            });
            return;
        }

        const instanceId = instances.items[0].id;

        logger.emit({
            severityText: 'INFO',
            body: `Terminating VM instance for server ID: ${serverId}`,
            attributes: { serverId, instanceId }
        });

        await computeClient.terminateInstance({
            instanceId,
        });

        logger.emit({
            severityText: 'INFO',
            body: `VM instance termination initiated for server ID: ${serverId}`,
            attributes: { serverId, instanceId }
        });
    }

    async waitForInstanceRunning(params: {
        instanceId: string;
        region: Region;
        signal: AbortSignal;
    }): Promise<void> {
        const { instanceId, region, signal } = params;
        const { computeClient } = this.dependencies.ociClientFactory(region);

        logger.emit({
            severityText: 'INFO',
            body: `Waiting for VM instance to be RUNNING`,
            attributes: { instanceId }
        });

        await waitUntil(async () => {
            const instance = await computeClient.getInstance({ instanceId });
            if (instance.instance.lifecycleState === "RUNNING") {
                return true;
            }
            throw new Error(`VM instance ${instanceId} is not RUNNING yet. Current state: ${instance.instance.lifecycleState}`);
        }, { interval: 5000, timeout: 480000, signal });

        logger.emit({
            severityText: 'INFO',
            body: `VM instance is now RUNNING`,
            attributes: { instanceId }
        });
    }

    async getLatestImage(params: {
        region: Region;
        compartmentId: string;
        displayName: string;
    }): Promise<string> {
        const { region, compartmentId, displayName } = params;
        const { computeClient } = this.dependencies.ociClientFactory(region);

        logger.emit({
            severityText: 'INFO',
            body: `Retrieving latest image with display name: ${displayName}`,
            attributes: { displayName }
        });

        const images = await computeClient.listImages({
            compartmentId,
            displayName,
        });

        if (!images.items || images.items.length === 0) {
            throw new Error(`Image not found: ${displayName}`);
        }

        const latestImage = images.items.reduce((latest, current) => {
            const latestTime = new Date(latest.timeCreated || 0).getTime();
            const currentTime = new Date(current.timeCreated || 0).getTime();
            return currentTime > latestTime ? current : latest;
        });

        const imageId = latestImage.id;
        if (!imageId) {
            throw new Error(`Failed to retrieve image ID for ${displayName}`);
        }

        logger.emit({
            severityText: 'INFO',
            body: `Latest image retrieved with ID: ${imageId}`,
            attributes: { displayName, imageId }
        });

        return imageId;
    }
}
