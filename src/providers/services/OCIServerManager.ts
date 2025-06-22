import { containerinstances, core } from "oci-sdk";
import { getRegionDisplayName, Region, Server, Variant } from "../../core/domain";
import { ServerStatus } from "../../core/domain/ServerStatus";
import { ServerAbortManager } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ServerManager } from "../../core/services/ServerManager";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";
import { waitUntil } from "../utils/waitUntil";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";
import { StatusUpdater } from "../../core/services/StatusUpdater";

export class OCIServerManager implements ServerManager {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGenerator: PasswordGenerator;
            ociClientFactory: (region: Region) => { containerClient: containerinstances.ContainerInstanceClient, vncClient: core.VirtualNetworkClient }
            serverAbortManager: ServerAbortManager,
            ociCredentialsFactory: OCICredentialsFactory
        }
    ) { }

    private async createNetworkSecurityGroup(args: { serverId: string; region: Region; vncClient: core.VirtualNetworkClient; vcnId: string; compartmentId: string; }): Promise<string> {
        const { serverId, vncClient, vcnId, compartmentId } = args;
        // Create NSG
        const nsgResponse = await vncClient.createNetworkSecurityGroup({
            createNetworkSecurityGroupDetails: {
                compartmentId: compartmentId,
                vcnId: vcnId,
                displayName: serverId,
            }
        });
        const nsgId = nsgResponse.networkSecurityGroup?.id;
        if (!nsgId) throw new Error("Failed to create NSG");
        // Add ingress rules for TCP and UDP 27015-27020 from all sources
        for (const protocol of ["6", "17"]) { // 6=TCP, 17=UDP
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

    private async deleteNetworkSecurityGroup(args: { nsgId: string; vncClient: core.VirtualNetworkClient }) {
        const { nsgId, vncClient } = args;
        await vncClient.deleteNetworkSecurityGroup({ networkSecurityGroupId: nsgId });
    }

    async deployServer(args: {
        serverId: string;
        region: Region;
        variantName: Variant;
        statusUpdater: StatusUpdater;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }): Promise<Server> {
        const { serverCommander, configManager, passwordGenerator, ociClientFactory, serverAbortManager } = this.dependencies;
        const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {}, statusUpdater } = args;

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

        // Notify user: Creating security group
        await statusUpdater(`🛡️ [1/5] Creating SHIELD Firewall...`);
        // Create NSG for this server
        const nsgId = await this.createNetworkSecurityGroup({ serverId, region, vncClient, vcnId: oracleRegionConfig.vnc_id, compartmentId: oracleRegionConfig.compartment_id });

        // Notify user: Creating container instance
        await statusUpdater(`📦 [2/5] Creating server instance...`);
        const ociCredentials = this.dependencies.ociCredentialsFactory(region);
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
                            "+log",
                            "on",
                            "+logaddress_add",
                            process.env.SRCDS_LOG_ADDRESS || "",
                            "+sv_logsecret",
                            serverId
                        ],
                        environmentVariables,
                    },
                    {
                        displayName: "shield",
                        imageUrl: "sonikro/tf2-quickserver-shield:latest",
                        environmentVariables: {
                            MAXBYTES: "2000000",
                            SRCDS_PASSWORD: rconPassword,
                            NSG_NAME: serverId,
                            COMPARTMENT_ID: oracleRegionConfig.compartment_id,
                            VCN_ID: oracleRegionConfig.vnc_id,
                            OCI_CONFIG_FILE_CONTENT: Buffer.from(ociCredentials.configFileContent).toString("base64"),
                            OCI_PRIVATE_KEY_FILE_CONTENT: Buffer.from(ociCredentials.privateKeyFileContent).toString("base64"),
                        }
                    }
                ],
                vnics: [
                    {
                        displayName: `vnic-${serverId}`,
                        subnetId: oracleRegionConfig.subnet_id,
                        isPublicIpAssigned: true,
                        nsgIds: [
                            nsgId
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

        // Notify user: Waiting for VNIC ID
        await statusUpdater(`🌐 [3/5] Waiting for Server Network Interfaces to be ready...`);
        // Retrieve the VNIC ID from the container instance
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

        // Notify user: Waiting for container to be ACTIVE
        await statusUpdater(`⏳ [4/5] Waiting for server instance to be **ACTIVE**...`);
        // Wait for container to be ACTIVE
        await waitUntil(async () => {
            const containerInstance = await containerClient.getContainerInstance({
                containerInstanceId: containerId
            });
            if (containerInstance.containerInstance.lifecycleState === "ACTIVE") {
                return true;
            }
            throw new Error("Container instance is not ACTIVE yet");
        }, { interval: 5000, timeout: 360000, signal: abortController.signal });

        // Notify user: Waiting for server to be ready for RCON
        await statusUpdater(`🔄 [5/5] Waiting for server to be ready to receive RCON commands...`);
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
                timeout: 360000,
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
        const { containerClient, vncClient } = ociClientFactory(region);
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
        // Get NSG ID by name (serverId)
        // NOTE: vcn_id must be present in your OracleRegionSettings config
        const vcnId = oracleRegionConfig.vnc_id
        const nsgs = await vncClient.listNetworkSecurityGroups({
            compartmentId: oracleRegionConfig.compartment_id,
            displayName: serverId,
            vcnId: vcnId,
        });
        let nsgId: string | undefined = undefined;
        if (nsgs.items && nsgs.items.length > 0) {
            nsgId = nsgs.items[0].id;
        }
        await containerClient.deleteContainerInstance({
            containerInstanceId,
        });
        // Wait for the NSG to have no VNICs associated before deleting it
        if (nsgId) {
            await waitUntil(async () => {
                const vnicsResp = await vncClient.listNetworkSecurityGroupVnics({ networkSecurityGroupId: nsgId });
                if (!vnicsResp.items || vnicsResp.items.length === 0) {
                    return true;
                }
                throw new Error("NSG still has associated VNICs");
            }, { interval: 5000, timeout: 300000 });
            await this.deleteNetworkSecurityGroup({ nsgId, vncClient });
        }
    }

}
