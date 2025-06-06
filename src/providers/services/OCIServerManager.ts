import { containerinstances, core } from "oci-sdk";
import { getRegionDisplayName, Region, Server, Variant } from "../../core/domain";
import { ServerStatus } from "../../core/domain/ServerStatus";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";
import { waitUntil } from "../utils/waitUntil";

export class OCIServerManager implements ServerManager {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGenerator: PasswordGenerator;
            ociClientFactory: (region: Region) => { containerClient: containerinstances.ContainerInstanceClient, vncClient: core.VirtualNetworkClient }
            serverAbortManager: ServerAbortManager
        }
    ) { }

    async deployServer(args: {
        serverId: string;
        region: Region;
        variantName: Variant;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }): Promise<Server> {
        const { serverCommander, configManager, passwordGenerator, ociClientFactory, serverAbortManager } = this.dependencies;
        const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {} } = args;

        const { containerClient, vncClient } = ociClientFactory(region);
        const variantConfig = configManager.getVariantConfig(variantName);
        const regionConfig = configManager.getRegionConfig(region);
        const oracleConfig = configManager.getOracleConfig();
        const oracleRegionConfig = oracleConfig.regions[region];
        if (!oracleRegionConfig) {
            throw new Error(`Region ${region} is not configured in Oracle config`);
        }

        const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false };
        const serverPassword = passwordGenerator(passwordSettings);
        const rconPassword = passwordGenerator(passwordSettings);
        const tvPassword = passwordGenerator(passwordSettings);

        const containerImage = variantConfig.image;

        const defaultCfgsEnvironment = variantConfig.defaultCfgs
            ? Object.entries(variantConfig.defaultCfgs).map(([key, value]) => ({
                [`DEFAULT_${key.toUpperCase()}_CFG`]: value,
            }))
            : [];

        // the admins array is immutable, so we need to create a new array
        const adminList = variantConfig.admins ? [...variantConfig.admins, sourcemodAdminSteamId] : [sourcemodAdminSteamId];

        const hostname = variantConfig.hostname ? variantConfig.hostname.replace("{region}", getRegionDisplayName(region)) : regionConfig.srcdsHostname;
        const environmentVariables: Record<string, string> = {
            SERVER_HOSTNAME: hostname,
            SERVER_PASSWORD: serverPassword,
            DEMOS_TF_APIKEY: process.env.DEMOS_TF_APIKEY || "",
            LOGS_TF_APIKEY: process.env.LOGS_TF_APIKEY || "",
            RCON_PASSWORD: rconPassword,
            STV_NAME: regionConfig.tvHostname,
            STV_PASSWORD: tvPassword,
            ADMIN_LIST: adminList.join(","),
            ...Object.assign({}, ...defaultCfgsEnvironment),
            ...extraEnvs,
        };

        const containerRequest: containerinstances.requests.CreateContainerInstanceRequest = {
            createContainerInstanceDetails: {
                displayName: serverId,
                availabilityDomain: oracleRegionConfig.availability_domain,
                compartmentId: oracleRegionConfig.compartment_id,
                shape: variantConfig.shape,
                shapeConfig: {
                    ocpus: variantConfig.ocpu,
                    memoryInGBs: variantConfig.memory
                },
                containerRestartPolicy: containerinstances.models.ContainerInstance.ContainerRestartPolicy.Always,
                containers: [
                    {
                        displayName: serverId,
                        imageUrl: containerImage,
                        arguments: [
                            "-enablefakeip",
                            "+sv_pure",
                            variantConfig.svPure.toString(),
                            "+maxplayers",
                            variantConfig.maxPlayers.toString(),
                            "+map",
                            variantConfig.map,
                        ],
                        environmentVariables,
                    },
                    {
                        displayName: "shield",
                        imageUrl: "sonikro/tf2-quickserver-shield:latest",
                        environmentVariables: {
                            MAXBYTES: "2000000",
                            RCON_PASSWORD: rconPassword,
                            NSG_ID: serverId
                        }
                    }
                ],
                vnics: [
                    {
                        displayName: `vnic-${serverId}`,
                        subnetId: oracleRegionConfig.subnet_id,
                        isPublicIpAssigned: true,
                        nsgIds: [
                            oracleRegionConfig.nsg_id
                        ],
                    },
                ],
            }
        };

        const abortController = serverAbortManager.getOrCreate(serverId); 
        console.log(`Creating container instance for server ID: ${serverId}`);
        const response = await containerClient.createContainerInstance(containerRequest);
        const containerId = response.containerInstance?.id;

        if (!containerId) {
            throw new Error("Failed to create container instance");
        }

        // Retrieve the VNIC ID from the container instance
        console.log(`Waiting for VNIC ID for container instance: ${containerId}`);
        const vnicId = await waitUntil(async () => {
            const containerInstance = await containerClient.getContainerInstance({
                containerInstanceId: containerId
            });
            if (containerInstance.containerInstance.vnics[0].vnicId) {
                return containerInstance.containerInstance.vnics[0].vnicId;
            };
            throw new Error("VNIC ID not available yet");
        }, { signal: abortController.signal });

        // Fetch the VNIC details to get the public IP
        const vnicDetails = await vncClient.getVnic({ vnicId });

        const publicIp = vnicDetails.vnic?.publicIp;
        if (!publicIp) {
            throw new Error("Failed to retrieve public IP");
        }


        // Wait for container to be ACTIVE
        console.log(`Waiting for container instance to be ACTIVE: ${containerId}`);
        await waitUntil(async () => {
            const containerInstance = await containerClient.getContainerInstance({
                containerInstanceId: containerId
            });
            if (containerInstance.containerInstance.lifecycleState === "ACTIVE") {
                return true;
            }
            throw new Error("Container instance is not ACTIVE yet");
        }, { interval: 5000, timeout: 300000, signal: abortController.signal });

        console.log(`Container instance is ACTIVE: ${containerId}`);

        console.log(`Waiting for server ${serverId} to be ready to receive RCON commands...`);
        const { sdrAddress } = await waitUntil<{ sdrAddress: string }>(
            async () => {
                const result = await serverCommander.query({
                    command: "status",
                    host: publicIp!,
                    password: rconPassword,
                    port: 27015,
                    timeout: 5000,
                });

                const serverStatus = new ServerStatus(result);

                if (!serverStatus.sourceTVIp) {
                    throw new Error("Server is not ready yet");
                }

                return {
                    sdrAddress: `${serverStatus.serverIp}:${serverStatus.serverPort}`,
                };
            },
            {
                timeout: 300000,
                interval: 5000,
                signal: abortController.signal,
            }
        );

        serverAbortManager.delete(serverId); // Clean up the abort controller after successful deployment

        const [sdrIp, sdrPort] = sdrAddress.split(":");

        return {
            serverId,
            region,
            variant: variantName,
            hostIp: sdrIp,
            hostPort: Number(sdrPort),
            rconPassword,
            rconAddress: publicIp,
            hostPassword: serverPassword,
            tvIp: publicIp,
            tvPort: 27020,
            tvPassword,
        };
    }

    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        const { ociClientFactory } = this.dependencies;
        const { region, serverId } = args;
        const { containerClient } = ociClientFactory(region);
        const oracleConfig = this.dependencies.configManager.getOracleConfig();
        const oracleRegionConfig = oracleConfig.regions[region];
        if (!oracleRegionConfig) {
            throw new Error(`Region ${region} is not configured in Oracle config`);
        }

        const containerInstances = await containerClient.listContainerInstances({
            compartmentId: oracleRegionConfig.compartment_id,
            displayName: serverId,
        });

        if (!containerInstances.containerInstanceCollection.items || containerInstances.containerInstanceCollection.items.length === 0) {
            throw new Error(`No container instance found for serverId: ${serverId}`);
        }

        const containerInstanceId = containerInstances.containerInstanceCollection.items[0].id;

        await containerClient.deleteContainerInstance({
            containerInstanceId,
        });

    }

}
