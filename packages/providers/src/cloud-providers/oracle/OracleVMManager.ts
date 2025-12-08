import { Span } from '@opentelemetry/api';
import { ConfigManager, getRegionDisplayName, OCICredentialsFactory, PasswordGeneratorService, Region, Server, ServerAbortManager, ServerCommander, ServerManager, StatusUpdater, TF2ServerReadinessService, Variant } from "@tf2qs/core";
import { logger, meter, tracer } from '@tf2qs/telemetry';
import { Chance } from "chance";
import { core } from "oci-sdk";
import { defaultOracleServiceFactory, DefaultTF2ServerReadinessService } from '../../services';
import { OracleComputeService, OracleNetworkService } from './interfaces';
import { DefaultOracleComputeService, DefaultOracleNetworkService } from './services';
import { generateCloudInitScript } from './utils/generateCloudInitScript';
import { generateDockerCompose } from './utils/generateDockerCompose';

const chance = new Chance();

const serverCreationDurationHistogram = meter.createHistogram('server_creation_duration_seconds', {
    description: 'Duration to create a server (seconds)',
});

export interface OracleVMManagerFactoryDependencies {
    serverCommander: ServerCommander;
    configManager: ConfigManager;
    passwordGeneratorService: PasswordGeneratorService;
    serverAbortManager: ServerAbortManager;
    ociCredentialsFactory: OCICredentialsFactory;
    region: Region;
}

export class OracleVMManager implements ServerManager {
    static create(dependencies: OracleVMManagerFactoryDependencies): OracleVMManager {
        const { region, serverCommander, configManager, passwordGeneratorService, serverAbortManager, ociCredentialsFactory } = dependencies;

        const { computeClient, vncClient } = defaultOracleServiceFactory(region);

        const oracleNetworkService = new DefaultOracleNetworkService({
            vncClient,
            computeClient
        });

        const oracleComputeService = new DefaultOracleComputeService({
            ociClientFactory: defaultOracleServiceFactory,
            configManager
        });

        const tf2ServerReadinessService = new DefaultTF2ServerReadinessService(serverCommander);

        return new OracleVMManager({
            serverCommander,
            configManager,
            passwordGeneratorService,
            ociClientFactory: defaultOracleServiceFactory,
            serverAbortManager,
            ociCredentialsFactory,
            oracleNetworkService,
            oracleComputeService,
            tf2ServerReadinessService
        });
    }

    constructor(
        private readonly dependencies: {
            serverCommander: ServerCommander;
            configManager: ConfigManager;
            passwordGeneratorService: PasswordGeneratorService;
            ociClientFactory: (region: Region) => { computeClient: core.ComputeClient, vncClient: core.VirtualNetworkClient }
            serverAbortManager: ServerAbortManager;
            ociCredentialsFactory: OCICredentialsFactory;
            oracleNetworkService: OracleNetworkService;
            oracleComputeService: OracleComputeService;
            tf2ServerReadinessService: TF2ServerReadinessService;
        }
    ) { }

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
            const { configManager, passwordGeneratorService, serverAbortManager } = this.dependencies;
            const { region, variantName, sourcemodAdminSteamId, serverId, extraEnvs = {}, statusUpdater } = args;
            const abortController = serverAbortManager.getOrCreate(serverId);
            try {

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
                await statusUpdater(`🛡️ [1/5] Creating SHIELD Firewall...`);
                logger.emit({ severityText: 'INFO', body: `Creating network security group for server ID: ${serverId}`, attributes: { serverId } });
                nsgId = await this.dependencies.oracleNetworkService.createNetworkSecurityGroup({ serverId, vcnId: oracleRegionConfig.vnc_id, compartmentId: oracleRegionConfig.compartment_id });

                let instanceId: string | undefined;
                await statusUpdater(`📦 [2/5] Creating VM instance...`);
                const ociCredentials = this.dependencies.ociCredentialsFactory(region);

                const dockerComposeYaml = generateDockerCompose({
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

                const cloudInitScript = generateCloudInitScript({ dockerComposeYaml });
                const userDataBase64 = Buffer.from(cloudInitScript).toString('base64');

                const imageId = await this.dependencies.oracleComputeService.getLatestImage({
                    region,
                    compartmentId: oracleRegionConfig.compartment_id,
                    displayName: "tf2-quickserver-vm"
                });

                instanceId = await this.dependencies.oracleComputeService.launchInstance({
                    serverId,
                    region,
                    variantShape: variantConfig.shape,
                    variantOcpu: variantConfig.ocpu,
                    variantMemory: variantConfig.memory,
                    imageId,
                    nsgId,
                    userDataBase64,
                    oracleRegionConfig
                });

                await statusUpdater(`🌐 [3/5] Waiting for Server Network Interfaces to be ready...`);
                const publicIp = await this.dependencies.oracleNetworkService.getPublicIp({
                    instanceId: instanceId!,
                    compartmentId: oracleRegionConfig.compartment_id,
                    signal: abortController.signal
                });

                await statusUpdater(`⏳ [4/5] Waiting for VM instance to be **RUNNING**...`);
                await this.dependencies.oracleComputeService.waitForInstanceRunning({
                    instanceId: instanceId!,
                    region,
                    signal: abortController.signal
                });

                await statusUpdater(`🔄 [5/5] Waiting for server to be ready to receive RCON commands...`);
                const sdrAddress = await this.dependencies.tf2ServerReadinessService.waitForReady(
                    publicIp,
                    rconPassword,
                    serverId,
                    abortController.signal
                );

                logger.emit({ severityText: 'INFO', body: `Server deployment completed successfully for server ID: ${serverId}`, attributes: { serverId } });
                serverAbortManager.delete(serverId);

                const [sdrIp, sdrPort] = sdrAddress.split(":");

                parentSpan.end();
                const durationSeconds = (Date.now() - startTime) / 1000;
                serverCreationDurationHistogram.record(durationSeconds, {
                    region: region,
                    variant: variantName,
                });

                logger.emit({ severityText: 'INFO', body: `Server creation took ${durationSeconds.toFixed(2)} seconds for server ID: ${serverId}`, attributes: { serverId, durationSeconds } });
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
                const { region, serverId } = args;
                logger.emit({ severityText: 'INFO', body: `Starting server deletion for server ID: ${serverId}`, attributes: { serverId } });

                const oracleConfig = this.dependencies.configManager.getOracleConfig();
                const oracleRegionConfig = oracleConfig.regions[region];
                if (!oracleRegionConfig) {
                    throw new Error(`Region ${region} is not configured in Oracle config`);
                }

                await this.dependencies.oracleComputeService.terminateInstance({ serverId, region });

                await this.dependencies.oracleNetworkService.deleteNetworkSecurityGroup({
                    serverId,
                    region,
                    vcnId: oracleRegionConfig.vnc_id,
                    compartmentId: oracleRegionConfig.compartment_id
                });

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
