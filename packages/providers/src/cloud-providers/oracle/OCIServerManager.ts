import { logger, tracer, meter } from '@tf2qs/telemetry';
import { Span } from '@opentelemetry/api';
import { containerinstances, core } from "oci-sdk";
import { getRegionDisplayName, Region, Server, Variant } from "@tf2qs/core";
import { ServerStatus, ServerStatusParser } from "@tf2qs/core";
import { ServerAbortManager } from "@tf2qs/core";
import { ServerCommander } from "@tf2qs/core";
import { ServerManager } from "@tf2qs/core";
import { PasswordGeneratorService } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { waitUntil } from "../../utils/waitUntil";
import { OCICredentialsFactory } from "@tf2qs/core";
import { StatusUpdater } from "@tf2qs/core";
import { Chance } from "chance";

const chance = new Chance();

const serverCreationDurationHistogram = meter.createHistogram('server_creation_duration_seconds', {
  description: 'Duration to create a server (seconds)',
});

export class OCIServerManager implements ServerManager {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGeneratorService: PasswordGeneratorService;
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
        return await tracer.startActiveSpan('OCIServerManager.deployServer', async (parentSpan: Span) => {
            parentSpan.setAttribute('serverId', args.serverId);
            const startTime = Date.now();
            const { serverCommander, configManager, passwordGeneratorService, ociClientFactory, serverAbortManager } = this.dependencies;
            const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {}, statusUpdater } = args;
            const abortController = serverAbortManager.getOrCreate(serverId);
            try {

                const { containerClient, vncClient } = ociClientFactory(region);
                const variantConfig = configManager.getVariantConfig(variantName);
                const regionConfig = configManager.getRegionConfig(region);
                const oracleConfig = configManager.getOracleConfig();
                const oracleRegionConfig = oracleConfig.regions[region];
                if (!oracleRegionConfig) {
                    throw new Error(`Region ${region} is not configured in Oracle config`);
                }

                const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false };
                const serverPassword = passwordGeneratorService.generatePassword(passwordSettings);
                const rconPassword = passwordGeneratorService.generatePassword(passwordSettings);
                const tvPassword = passwordGeneratorService.generatePassword(passwordSettings);

                const containerImage = variantConfig.image;
                const logSecret = chance.integer({ min: 1, max: 999999 })

                const defaultCfgsEnvironment = variantConfig.defaultCfgs
                    ? Object.entries(variantConfig.defaultCfgs).map(([key, value]) => ({
                        [`DEFAULT_${key.toUpperCase()}_CFG`]: value,
                    }))
                    : [];

                // the admins array is immutable, so we need to create a new array
                const adminList = variantConfig.admins ? [...variantConfig.admins, sourcemodAdminSteamId] : [sourcemodAdminSteamId];

                // Extract first UUID block (before first hyphen) for hostname prefix
                const uuidPrefix = serverId.split('-')[0];
                
                const hostname = variantConfig.hostname ? variantConfig.hostname.replace("{region}", getRegionDisplayName(region)) : regionConfig.srcdsHostname;
                const finalHostname = `#${uuidPrefix} ${hostname}`;
                
                const environmentVariables: Record<string, string> = {
                    SERVER_HOSTNAME: finalHostname,
                    SERVER_PASSWORD: serverPassword,
                    DEMOS_TF_APIKEY: process.env.DEMOS_TF_APIKEY || "",
                    LOGS_TF_APIKEY: process.env.LOGS_TF_APIKEY || "",
                    RCON_PASSWORD: rconPassword,
                    STV_NAME: regionConfig.tvHostname,
                    STV_PASSWORD: tvPassword,
                    ADMIN_LIST: adminList.join(","),
                    SV_LOGSECRET: logSecret.toString(),
                    ...Object.assign({}, ...defaultCfgsEnvironment),
                    ...extraEnvs,
                };

                // Notify user: Creating security group
                let nsgId: string;
                await tracer.startActiveSpan('Create NSG', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🛡️ [1/5] Creating SHIELD Firewall...`);
                    logger.emit({ severityText: 'INFO', body: `Creating network security group for server ID: ${serverId}`, attributes: { serverId } });
                    nsgId = await this.createNetworkSecurityGroup({ serverId, region, vncClient, vcnId: oracleRegionConfig.vnc_id, compartmentId: oracleRegionConfig.compartment_id });
                    span.end();
                });

                // Notify user: Creating container instance
                let containerId: string | undefined;
                await tracer.startActiveSpan('Create Container Instance', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
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
                                        logSecret.toString(),
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
                                },
                                ...((process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_LICENSE_KEY !== "") ? [
                                    {
                                        displayName: "newrelic-infra",
                                        imageUrl: "newrelic/infrastructure:latest",
                                        environmentVariables: {
                                            NRIA_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
                                            NRIA_DISPLAY_NAME: `TF2-Server-${region}-${serverId}`,
                                            NRIA_OVERRIDE_HOSTNAME: `tf2-server-${region}-${serverId}`,
                                            NRIA_CUSTOM_ATTRIBUTES: `region=${region},serverId=${serverId},variant=${variantName}`,
                                        },
                                    }
                                ] : [])
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
                            imagePullSecrets: [
                                {
                                    secretType: "VAULT",
                                    registryEndpoint: "docker.io",
                                    secretId: oracleRegionConfig.secret_id,
                                } as containerinstances.models.CreateVaultImagePullSecretDetails
                            ],
                        }
                    };

                    logger.emit({ severityText: 'INFO', body: `Creating container instance for server ID: ${serverId}`, attributes: { serverId } });
                    const response = await containerClient.createContainerInstance(containerRequest);
                    containerId = response.containerInstance?.id;
                    if (!containerId) {
                        throw new Error("Failed to create container instance");
                    }
                    span.end();
                });

                // Notify user: Waiting for VNIC ID
                let vnicId: string;
                await tracer.startActiveSpan('Wait for VNIC', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🌐 [3/5] Waiting for Server Network Interfaces to be ready...`);
                    vnicId = await waitUntil(async () => {
                        const containerInstance = await containerClient.getContainerInstance({
                            containerInstanceId: containerId!
                        });
                        if (containerInstance.containerInstance.vnics[0].vnicId) {
                            return containerInstance.containerInstance.vnics[0].vnicId;
                        };
                        throw new Error("VNIC ID not available yet");
                    }, { signal: abortController.signal });
                    span.end();
                });

                // Fetch the VNIC details to get the public IP
                let publicIp: string | undefined;
                await tracer.startActiveSpan('Fetch VNIC Details', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    const vnicDetails = await vncClient.getVnic({ vnicId });
                    publicIp = vnicDetails.vnic?.publicIp;
                    if (!publicIp) {
                        throw new Error("Failed to retrieve public IP");
                    }
                    span.end();
                });

                // Notify user: Waiting for container to be ACTIVE
                await tracer.startActiveSpan('Wait for ACTIVE', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`⏳ [4/5] Waiting for server instance to be **ACTIVE**... This usually takes 2-3 minutes.`);
                    await waitUntil(async () => {
                        const containerInstance = await containerClient.getContainerInstance({
                            containerInstanceId: containerId!
                        });
                        if (containerInstance.containerInstance.lifecycleState === "ACTIVE") {
                            return true;
                        }
                        throw new Error(`Container instance ${containerId} is not ACTIVE yet. Current state: ${containerInstance.containerInstance.lifecycleState}`);
                    }, { interval: 5000, timeout: 480000, signal: abortController.signal });
                    span.end();
                });

                // Notify user: Waiting for server to be ready for RCON
                let sdrAddress: string = '';
                await tracer.startActiveSpan('Wait for RCON Ready', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🔄 [5/5] Waiting for server to be ready to receive RCON commands...`);
                    logger.emit({ severityText: 'INFO', body: `Waiting for server ${serverId} to be ready to receive RCON commands...`, attributes: { serverId } });
                    const result = await waitUntil<{ sdrAddress: string }>(
                        async () => {
                            const result = await serverCommander.query({
                                command: "status",
                                host: publicIp!,
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
                            timeout: 360000,
                            interval: 5000,
                            signal: abortController.signal,
                        }
                    );
                    sdrAddress = result.sdrAddress;
                    span.end();
                });

                logger.emit({ severityText: 'INFO', body: `Server deployment completed successfully for server ID: ${serverId}`, attributes: { serverId } });
                serverAbortManager.delete(serverId); // Clean up the abort controller after successful deployment

                const [sdrIp, sdrPort] = sdrAddress.split(":");

                parentSpan.end();
                // Record server creation duration in seconds
                const durationSeconds = (Date.now() - startTime) / 1000;
                serverCreationDurationHistogram.record(durationSeconds, {
                    region: region,
                    variant: variantName,
                });
                return {
                    serverId,
                    region,
                    variant: variantName,
                    hostIp: sdrIp,
                    hostPort: Number(sdrPort),
                    rconPassword,
                    rconAddress: publicIp as string,
                    hostPassword: serverPassword,
                    tvIp: publicIp as string,
                    tvPort: 27020,
                    tvPassword,
                    logSecret
                };
            } catch (err) {
                parentSpan.recordException?.(err as any);
                parentSpan.setStatus?.({ code: 2, message: String(err) });
                parentSpan.end();
                throw err;
            }
        });
    }

    async deleteServer(args: { serverId: string; region: Region }): Promise<void> {
        return await tracer.startActiveSpan('OCIServerManager.deleteServer', async (parentSpan: Span) => {
            parentSpan.setAttribute('serverId', args.serverId);
            try {
                const { ociClientFactory } = this.dependencies;
                const { region, serverId } = args;
                logger.emit({ severityText: 'INFO', body: `Starting server deletion for server ID: ${serverId}`, attributes: { serverId } });
                
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
                
                logger.emit({ severityText: 'INFO', body: `Deleting container instance for server ID: ${serverId}`, attributes: { serverId } });
                await containerClient.deleteContainerInstance({
                    containerInstanceId,
                });
                
                // Wait for the NSG to have no VNICs associated before deleting it
                if (nsgId) {
                    logger.emit({ severityText: 'INFO', body: `Deleting network security group for server ID: ${serverId}`, attributes: { serverId } });
                    await waitUntil(async () => {
                        const vnicsResp = await vncClient.listNetworkSecurityGroupVnics({ networkSecurityGroupId: nsgId });
                        if (!vnicsResp.items || vnicsResp.items.length === 0) {
                            return true;
                        }
                        throw new Error("NSG still has associated VNICs");
                    }, { interval: 5000, timeout: 300000 });
                    await this.deleteNetworkSecurityGroup({ nsgId, vncClient });
                }
                
                logger.emit({ severityText: 'INFO', body: `Server deletion completed successfully for server ID: ${serverId}`, attributes: { serverId } });
                parentSpan.end();
            } catch (err) {
                parentSpan.recordException?.(err as any);
                parentSpan.setStatus?.({ code: 2, message: String(err) });
                parentSpan.end();
                throw err;
            }
        });
    }

}
