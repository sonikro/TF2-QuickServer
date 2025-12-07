import { logger, tracer, meter } from '@tf2qs/telemetry';
import { Span } from '@opentelemetry/api';
import { core } from "oci-sdk";
import { getRegionDisplayName, Region, Server, Variant } from "@tf2qs/core";
import { ServerStatusParser } from "@tf2qs/core";
import { ServerAbortManager } from "@tf2qs/core";
import { ServerCommander } from "@tf2qs/core";
import { ServerManager } from "@tf2qs/core";
import { PasswordGeneratorService } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { waitUntil } from "../../utils/waitUntil";
import { OCICredentialsFactory } from "@tf2qs/core";
import { StatusUpdater } from "@tf2qs/core";
import { Chance } from "chance";
import * as yaml from 'yaml';

const chance = new Chance();

const serverCreationDurationHistogram = meter.createHistogram('server_creation_duration_seconds', {
    description: 'Duration to create a server (seconds)',
});

export class OracleVMManager implements ServerManager {
    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGeneratorService: PasswordGeneratorService;
            ociClientFactory: (region: Region) => { computeClient: core.ComputeClient, vncClient: core.VirtualNetworkClient }
            serverAbortManager: ServerAbortManager,
            ociCredentialsFactory: OCICredentialsFactory
        }
    ) { }

    private async createNetworkSecurityGroup(args: { serverId: string; region: Region; vncClient: core.VirtualNetworkClient; vcnId: string; compartmentId: string; }): Promise<string> {
        const { serverId, vncClient, vcnId, compartmentId } = args;
        const nsgResponse = await vncClient.createNetworkSecurityGroup({
            createNetworkSecurityGroupDetails: {
                compartmentId: compartmentId,
                vcnId: vcnId,
                displayName: serverId,
            }
        });
        const nsgId = nsgResponse.networkSecurityGroup?.id;
        if (!nsgId) throw new Error("Failed to create NSG");
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

    private async deleteNetworkSecurityGroup(args: { nsgId: string; vncClient: core.VirtualNetworkClient }) {
        const { nsgId, vncClient } = args;
        await vncClient.deleteNetworkSecurityGroup({ networkSecurityGroupId: nsgId });
    }

    private generateDockerComposeYaml(args: {
        serverId: string;
        variantConfig: any;
        environmentVariables: Record<string, string>;
        containerImage: string;
        rconPassword: string;
        region: Region;
        variantName: Variant;
        oracleRegionConfig: any;
        ociCredentials: { configFileContent: string; privateKeyFileContent: string };
    }): string {
        const { serverId, variantConfig, environmentVariables, containerImage, rconPassword, region, variantName, oracleRegionConfig, ociCredentials } = args;

        const tf2ServerCommand = [
            "-enablefakeip",
            `+sv_pure ${variantConfig.svPure}`,
            `+maxplayers ${variantConfig.maxPlayers}`,
            `+map ${variantConfig.map}`,
            "+log on",
            `+logaddress_add ${process.env.SRCDS_LOG_ADDRESS || ""}`,
            `+sv_logsecret ${environmentVariables.SV_LOGSECRET}`,
        ].join(" ");

        const services: Record<string, any> = {
            "tf2-server": {
                image: containerImage,
                container_name: "tf2-server",
                restart: "always",
                environment: environmentVariables,
                cap_add: ["ALL"],
                command: tf2ServerCommand,
                ports: [
                    "27015:27015/tcp",
                    "27015:27015/udp",
                    "27020:27020/tcp",
                    "27020:27020/udp"
                ]
            },
            shield: {
                image: "sonikro/tf2-quickserver-shield:latest",
                container_name: "shield",
                restart: "always",
                network_mode: "host",
                environment: {
                    MAXBYTES: "2000000",
                    SRCDS_PASSWORD: rconPassword,
                    NSG_NAME: serverId,
                    COMPARTMENT_ID: oracleRegionConfig.compartment_id,
                    VCN_ID: oracleRegionConfig.vnc_id,
                    OCI_CONFIG_FILE_CONTENT: Buffer.from(ociCredentials.configFileContent).toString("base64"),
                    OCI_PRIVATE_KEY_FILE_CONTENT: Buffer.from(ociCredentials.privateKeyFileContent).toString("base64"),
                },
                depends_on: ["tf2-server"]
            }
        };

        if (process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_LICENSE_KEY !== "") {
            services["newrelic-infra"] = {
                image: "newrelic/infrastructure:latest",
                container_name: "newrelic-infra",
                restart: "always",
                privileged: true,
                cap_add: ["ALL"],
                environment: {
                    NRIA_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
                    NRIA_DISPLAY_NAME: `TF2-Server-${region}-${serverId}`,
                    NRIA_OVERRIDE_HOSTNAME: `tf2-server-${region}-${serverId}`,
                    NRIA_CUSTOM_ATTRIBUTES: `region=${region},serverId=${serverId},variant=${variantName}`,
                }
            };
        }

        const dockerCompose = {
            version: "3.8",
            services
        };

        return yaml.stringify(dockerCompose);
    }

    private generateCloudInitScript(args: { dockerComposeYaml: string }): string {
        const { dockerComposeYaml } = args;
        return `#cloud-config

write_files:
  - path: /opt/tf2-quickserver/docker-compose.yml
    permissions: '0644'
    owner: root:root
    content: |
${dockerComposeYaml.split('\n').map(line => '      ' + line).join('\n')}
`;
    }

    async deployServer(args: {
        serverId: string;
        region: Region;
        variantName: Variant;
        statusUpdater: StatusUpdater;
        sourcemodAdminSteamId?: string;
        extraEnvs?: Record<string, string>;
    }): Promise<Server> {
        return await tracer.startActiveSpan('OracleVMManager.deployServer', async (parentSpan: Span) => {
            parentSpan.setAttribute('serverId', args.serverId);
            const startTime = Date.now();
            const { serverCommander, configManager, passwordGeneratorService, ociClientFactory, serverAbortManager } = this.dependencies;
            const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {}, statusUpdater } = args;
            const abortController = serverAbortManager.getOrCreate(serverId);
            try {

                const { computeClient, vncClient } = ociClientFactory(region);
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

                const adminList = variantConfig.admins ? [...variantConfig.admins, sourcemodAdminSteamId] : [sourcemodAdminSteamId];

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

                let nsgId: string;
                await tracer.startActiveSpan('Create NSG', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🛡️ [1/5] Creating SHIELD Firewall...`);
                    logger.emit({ severityText: 'INFO', body: `Creating network security group for server ID: ${serverId}`, attributes: { serverId } });
                    nsgId = await this.createNetworkSecurityGroup({ serverId, region, vncClient, vcnId: oracleRegionConfig.vnc_id, compartmentId: oracleRegionConfig.compartment_id });
                    span.end();
                });

                let instanceId: string | undefined;
                await tracer.startActiveSpan('Create VM Instance', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`📦 [2/5] Creating VM instance...`);
                    const ociCredentials = this.dependencies.ociCredentialsFactory(region);

                    const dockerComposeYaml = this.generateDockerComposeYaml({
                        serverId,
                        variantConfig,
                        environmentVariables,
                        containerImage,
                        rconPassword,
                        region,
                        variantName,
                        oracleRegionConfig,
                        ociCredentials
                    });

                    const cloudInitScript = this.generateCloudInitScript({ dockerComposeYaml });
                    const userDataBase64 = Buffer.from(cloudInitScript).toString('base64');

                    const images = await computeClient.listImages({
                        compartmentId: oracleRegionConfig.compartment_id,
                        displayName: "tf2-quickserver-vm",
                    });

                    if (!images.items || images.items.length === 0) {
                        throw new Error("tf2-quickserver-vm image not found in compartment");
                    }

                    const imageId = images.items[0].id;

                    logger.emit({ severityText: 'INFO', body: `Creating VM instance for server ID: ${serverId}`, attributes: { serverId } });
                    const launchInstanceResponse = await computeClient.launchInstance({
                        launchInstanceDetails: {
                            compartmentId: oracleRegionConfig.compartment_id,
                            availabilityDomain: oracleRegionConfig.availability_domain,
                            shape: variantConfig.shape,
                            shapeConfig: {
                                ocpus: variantConfig.ocpu,
                                memoryInGBs: variantConfig.memory
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

                    instanceId = launchInstanceResponse.instance?.id;
                    if (!instanceId) {
                        throw new Error("Failed to create VM instance");
                    }
                    span.end();
                });

                let vnicId: string;
                await tracer.startActiveSpan('Wait for VNIC', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`🌐 [3/5] Waiting for Server Network Interfaces to be ready...`);
                    vnicId = await waitUntil(async () => {
                        const vnicAttachments = await computeClient.listVnicAttachments({
                            compartmentId: oracleRegionConfig.compartment_id,
                            instanceId: instanceId!
                        });
                        if (vnicAttachments.items && vnicAttachments.items.length > 0 && vnicAttachments.items[0].vnicId) {
                            return vnicAttachments.items[0].vnicId;
                        }
                        throw new Error("VNIC ID not available yet");
                    }, { signal: abortController.signal });
                    span.end();
                });

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

                await tracer.startActiveSpan('Wait for RUNNING', async (span: Span) => {
                    span.setAttribute('serverId', serverId);
                    await statusUpdater(`⏳ [4/5] Waiting for VM instance to be **RUNNING**...`);
                    await waitUntil(async () => {
                        const instance = await computeClient.getInstance({ instanceId: instanceId! });
                        if (instance.instance.lifecycleState === "RUNNING") {
                            return true;
                        }
                        throw new Error(`VM instance ${instanceId} is not RUNNING yet. Current state: ${instance.instance.lifecycleState}`);
                    }, { interval: 5000, timeout: 480000, signal: abortController.signal });
                    span.end();
                });

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
                serverAbortManager.delete(serverId);

                const [sdrIp, sdrPort] = sdrAddress.split(":");

                parentSpan.end();
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
        return await tracer.startActiveSpan('OracleVMManager.deleteServer', async (parentSpan: Span) => {
            parentSpan.setAttribute('serverId', args.serverId);
            try {
                const { ociClientFactory } = this.dependencies;
                const { region, serverId } = args;
                logger.emit({ severityText: 'INFO', body: `Starting server deletion for server ID: ${serverId}`, attributes: { serverId } });

                const { computeClient, vncClient } = ociClientFactory(region);
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
                    logger.emit({ severityText: 'INFO', body: `No VM instance found for serverId: ${serverId}, skipping deletion`, attributes: { serverId } });
                    parentSpan.end();
                    return;
                }

                const instanceId = instances.items[0].id;
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

                logger.emit({ severityText: 'INFO', body: `Terminating VM instance for server ID: ${serverId}`, attributes: { serverId } });
                await computeClient.terminateInstance({
                    instanceId,
                });

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
