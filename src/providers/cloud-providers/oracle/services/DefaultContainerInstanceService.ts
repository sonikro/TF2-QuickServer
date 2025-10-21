import { containerinstances } from "oci-sdk";
import { DeploymentContext } from "../../../../core/models";
import { OperationTracingService } from "../../../../telemetry/OperationTracingService";
import { ContainerInstanceService } from "../interfaces";
import { OCIConfigService } from "./OCIConfigService";
import { waitUntil } from "../../../utils/waitUntil";
import { Chance } from "chance";

const chance = new Chance();

type DefaultContainerInstanceServiceDependencies = {
    ociConfigService: OCIConfigService;
    operationTracer: OperationTracingService;
};

export class DefaultContainerInstanceService implements ContainerInstanceService {
    constructor(private readonly dependencies: DefaultContainerInstanceServiceDependencies) {}

    async create(params: {
        context: DeploymentContext;
        environment: Record<string, string>;
        variantConfig: any;
        nsgId: string;
    }): Promise<string> {
        const { context, environment, variantConfig, nsgId } = params;
        return await this.dependencies.operationTracer.executeWithTracing(
            'ContainerInstanceService.create',
            context.serverId,
            async () => {
                const { containerClient } = this.dependencies.ociConfigService.getClients({ region: context.region });
                const regionConfig = this.dependencies.ociConfigService.getOracleRegionConfig({ region: context.region });
                const ociCredentials = this.dependencies.ociConfigService.getOCICredentials({ region: context.region });

                this.dependencies.operationTracer.logOperationStart(
                    'Creating container instance',
                    context.serverId,
                    context.region
                );

                const containerImage = variantConfig.image;

                const containerRequest: containerinstances.requests.CreateContainerInstanceRequest = {
                    createContainerInstanceDetails: {
                        displayName: context.serverId,
                        availabilityDomain: regionConfig.availability_domain,
                        compartmentId: regionConfig.compartment_id,
                        shape: variantConfig.shape,
                        shapeConfig: {
                            ocpus: variantConfig.ocpu,
                            memoryInGBs: variantConfig.memory
                        },
                        containerRestartPolicy: containerinstances.models.ContainerInstance.ContainerRestartPolicy.Always,
                        containers: [
                            {
                                displayName: context.serverId,
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
                                    environment.SV_LOGSECRET,
                                ],
                                environmentVariables: environment,
                            },
                            {
                                displayName: "shield",
                                imageUrl: "sonikro/tf2-quickserver-shield:latest",
                                environmentVariables: {
                                    MAXBYTES: "2000000",
                                    SRCDS_PASSWORD: environment.RCON_PASSWORD,
                                    NSG_NAME: context.serverId,
                                    COMPARTMENT_ID: regionConfig.compartment_id,
                                    VCN_ID: regionConfig.vnc_id,
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
                                        NRIA_DISPLAY_NAME: `TF2-Server-${context.region}-${context.serverId}`,
                                        NRIA_OVERRIDE_HOSTNAME: `tf2-server-${context.region}-${context.serverId}`,
                                        NRIA_CUSTOM_ATTRIBUTES: `region=${context.region},serverId=${context.serverId},variant=${context.variantName}`,
                                    },
                                }
                            ] : [])
                        ],
                        vnics: [
                            {
                                displayName: `vnic-${context.serverId}`,
                                subnetId: regionConfig.subnet_id,
                                isPublicIpAssigned: true,
                                nsgIds: [nsgId],
                            },
                        ],
                        imagePullSecrets: [
                            {
                                secretType: "VAULT",
                                registryEndpoint: "docker.io",
                                secretId: regionConfig.secret_id,
                            } as containerinstances.models.CreateVaultImagePullSecretDetails
                        ],
                    }
                };

                const response = await containerClient.createContainerInstance(containerRequest);
                const containerId = response.containerInstance?.id;
                
                if (!containerId) {
                    throw new Error("Failed to create container instance");
                }

                this.dependencies.operationTracer.logOperationSuccess(
                    'Container instance created',
                    context.serverId,
                    context.region,
                    { containerId }
                );

                return containerId;
            }
        );
    }

    async waitForActive(params: { containerId: string; signal: AbortSignal }): Promise<void> {
        const { containerId, signal } = params;
        const { containerClient } = this.dependencies.ociConfigService.getClients({ region: 'us-east-1' as any });

        await waitUntil(async () => {
            const containerInstance = await containerClient.getContainerInstance({
                containerInstanceId: containerId
            });
            if (containerInstance.containerInstance.lifecycleState === "ACTIVE") {
                return true;
            }
            throw new Error(`Container instance ${containerId} is not ACTIVE yet. Current state: ${containerInstance.containerInstance.lifecycleState}`);
        }, { interval: 5000, timeout: 480000, signal });
    }

    async delete(params: { serverId: string; region: string }): Promise<void> {
        const { serverId, region } = params;
        return await this.dependencies.operationTracer.executeWithTracing(
            'ContainerInstanceService.delete',
            serverId,
            async () => {
                const { containerClient } = this.dependencies.ociConfigService.getClients({ region: region as any });
                const regionConfig = this.dependencies.ociConfigService.getOracleRegionConfig({ region: region as any });

                this.dependencies.operationTracer.logOperationStart(
                    'Deleting container instance',
                    serverId,
                    region as any
                );

                const containerInstances = await containerClient.listContainerInstances({
                    compartmentId: regionConfig.compartment_id,
                    displayName: serverId,
                });

                if (!containerInstances.containerInstanceCollection.items || containerInstances.containerInstanceCollection.items.length === 0) {
                    throw new Error(`No container instance found for serverId: ${serverId}`);
                }

                const containerInstanceId = containerInstances.containerInstanceCollection.items[0].id;

                await containerClient.deleteContainerInstance({
                    containerInstanceId,
                });

                this.dependencies.operationTracer.logOperationSuccess(
                    'Container instance deleted',
                    serverId,
                    region as any,
                    { containerInstanceId }
                );
            }
        );
    }
}
