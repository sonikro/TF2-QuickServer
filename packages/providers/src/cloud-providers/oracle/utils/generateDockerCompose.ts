import { Region, Variant, VariantConfig, OCICredentials, OracleRegionSettings } from "@tf2qs/core";
import * as yaml from 'yaml';

type DockerComposeParams = {
    serverId: string;
    variantConfig: VariantConfig;
    environmentVariables: Record<string, string>;
    containerImage: string;
    rconPassword: string;
    region: Region;
    variantName: Variant;
    oracleRegionConfig: OracleRegionSettings;
    ociCredentials: OCICredentials;
};

export function generateDockerCompose(params: DockerComposeParams): string {
    const { serverId, variantConfig, environmentVariables, containerImage, rconPassword, region, variantName, oracleRegionConfig, ociCredentials } = params;

    const tf2ServerCommand = [
        "-enablefakeip",
        `+sv_pure ${variantConfig.svPure}`,
        `+maxplayers ${variantConfig.maxPlayers}`,
        `+map ${variantConfig.map}`,
        "+log on",
        `+logaddress_add ${process.env.SRCDS_LOG_ADDRESS || ""}`,
        `+sv_logsecret ${environmentVariables.SV_LOGSECRET}`,
    ].join(" ");

    type DockerService = {
        image: string;
        container_name: string;
        restart: string;
        environment: Record<string, string>;
        cap_add?: string[];
        command?: string;
        ports?: string[];
        network_mode?: string;
        depends_on?: string[];
        privileged?: boolean;
    };

    const services: Record<string, DockerService> = {
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
