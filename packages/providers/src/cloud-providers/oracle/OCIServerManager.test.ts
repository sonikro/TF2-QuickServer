import { containerinstances, core } from "oci-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CloudProvider, OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "@tf2qs/core";
import { OCICredentialsFactory } from "@tf2qs/core";
import { TF2ServerConfigFactory } from "@tf2qs/core";
import { TF2ServerConfig } from "@tf2qs/core";
import { ServerCredentials } from "@tf2qs/core";
import { AbortError } from "@tf2qs/core";
import { ServerCommander } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { logger } from "@tf2qs/telemetry";
import { DefaultServerAbortManager } from "../../services/DefaultServerAbortManager";
import { OCIServerManager } from "./OCIServerManager";

// Mock only the logger, not the whole otel module
vi.mock('@tf2qs/telemetry', async () => {
  const actual = await vi.importActual<any>('@tf2qs/telemetry');
  return {
    ...actual,
    logger: {
      emit: vi.fn()
    }
  };
});

const testRegion = Region.SA_SAOPAULO_1;
const testVariant = "vanilla" as Variant;

/** Fixed TF2ServerConfig returned by the mocked factory */
function makeTestTF2ServerConfig(): TF2ServerConfig {
  const credentials = new ServerCredentials({
    serverPassword: "test-password",
    rconPassword: "test-password",
    tvPassword: "test-password",
    logSecret: 123456,
  });
  return new TF2ServerConfig({
    credentials,
    environmentVariables: {
      SERVER_HOSTNAME: "test Test Server",
      SERVER_PASSWORD: "test-password",
      DEMOS_TF_APIKEY: "test-demo-tf-api-key",
      LOGS_TF_APIKEY: "test-logs-tf-api-key",
      RCON_PASSWORD: "test-password",
      STV_NAME: "Test STV",
      STV_PASSWORD: "test-password",
      ADMIN_LIST: "default_admin,12345678901234567",
      SV_LOGSECRET: "123456",
    },
    containerImage: "test-image",
    startupMap: "ctf_2fort",
    maxPlayers: 24,
    svPure: 1,
    containerArgs: [
      "-enablefakeip",
      "+sv_pure", "1",
      "+maxplayers", "24",
      "+map", "ctf_2fort",
      "+log", "on",
      "+logaddress_add", "logaddress:port",
      "+sv_logsecret", "123456",
    ],
  });
}

function createTestEnvironment() {
  const serverCommander = mock<ServerCommander>();
  const configManager = mock<ConfigManager>();
  const tf2ServerConfigFactory = mock<TF2ServerConfigFactory>();

  const containerClient = mock<containerinstances.ContainerInstanceClient>();
  const vncClient = mock<core.VirtualNetworkClient>();

  const ociClientFactory = () => ({
    containerClient,
    vncClient,
  });

  const variantConfig: VariantConfig = {
    image: "test-image",
    shape: "test-shape",
    ocpu: 1,
    memory: 2,
    svPure: 1,
    maxPlayers: 24,
    map: "ctf_2fort",
    serverName: "Test Server",
    admins: Object.freeze([
      "default_admin"
    ])
  };

  const regionConfig: RegionConfig = {
    srcdsHostname: "Test Server",
    tvHostname: "Test STV",
    displayName: "Test Region",
    cloudProvider: CloudProvider.ORACLE,
  };

  const oracleConfig: OracleConfig = {
    regions: {
      [testRegion]: {
        availability_domain: "AD-1",
        subnet_id: "subnet123",
        nsg_id: "nsg123",
        compartment_id: "compartment123",
        vnc_id: "vnc123",
        secret_id: "ocid1.vaultsecret.oc1.sa-saopaulo-1.test123",
      }
    }
  };

  configManager.getVariantConfig.mockReturnValue(variantConfig);
  configManager.getRegionConfig.mockReturnValue(regionConfig);
  configManager.getOracleConfig.mockReturnValue(oracleConfig);

  // Default factory mock returns fixed TF2ServerConfig
  tf2ServerConfigFactory.build.mockResolvedValue(makeTestTF2ServerConfig());

  process.env.DEMOS_TF_APIKEY = "test-demo-tf-api-key";
  process.env.LOGS_TF_APIKEY = "test-logs-tf-api-key";
  process.env.SRCDS_LOG_ADDRESS = "logaddress:port"
  when(containerClient.createContainerInstance)
    .calledWith(expect.anything())
    .thenResolve(mock({
      containerInstance: { id: "container123" },
    }));

  // WaitUntil #1: containerClient.getContainerInstance → return VNIC ID
  let vnicResolved = false;
  containerClient.getContainerInstance.mockImplementation(async () => {
    if (!vnicResolved) {
      vnicResolved = true;
      throw new Error("VNIC not ready");
    }
    return {
      containerInstance: {
        vnics: [{ vnicId: "vnic-123" }],
        lifecycleState: "PROVISIONING"
      }
    } as any;
  });

  // getVnic returns public IP
  vncClient.getVnic.mockResolvedValue({
    vnic: {
      publicIp: "1.2.3.4"
    }
  } as any);;

  // WaitUntil #2: container becomes ACTIVE
  let activeResolved = false;
  containerClient.getContainerInstance.mockImplementation(async () => {
    if (!activeResolved) {
      activeResolved = true;
      return {
        containerInstance: {
          vnics: [{ vnicId: "vnic-123" }],
          lifecycleState: "PROVISIONING"
        }
      } as any;
    }
    return {
      containerInstance: {
        vnics: [{ vnicId: "vnic-123" }],
        lifecycleState: "ACTIVE"
      }
    } as any;
  });

  // WaitUntil #3: serverCommander.query resolves with server ready
  when(serverCommander.query)
    .calledWith({
      command: "status",
      host: "1.2.3.4",
      password: "test-password",
      port: 27015,
      timeout: 5000,
    })
    .thenResolve(`hostname: TF2-QuickServer | Virginia
version : 9543365/24 9543365 secure
udp/ip  : 169.254.173.35:13768  (local: 0.0.0.0:27015)  (public IP from Steam: 44.200.128.3)
steamid : [A:1:1871475725:44792] (90264374594008077)
account : not logged in  (No account specified)
map     : cp_badlands at: 0 x, 0 y, 0 z
tags    : cp
sourcetv:  169.254.173.35:13769, delay 30.0s  (local: 0.0.0.0:27020)
players : 1 humans, 1 bots (25 max)
edicts  : 426 used of 2048 max
# userid name                uniqueid            connected ping loss state  adr
#      2 "TF2-QuickServer TV | Virginia @" BOT                       active
#      3 "sonikro"           [U:1:29162964]      00:20       60    0 active 169.254.249.16:18930
`)

  const serverAbortManager = new DefaultServerAbortManager();
  const ociCredentialsFactory: OCICredentialsFactory = vi.fn().mockReturnValue({
    configFileContent: "test-config-content",
    privateKeyFileContent: "test-private-key-content"
  });

  const sut = new OCIServerManager({
    serverCommander,
    configManager,
    tf2ServerConfigFactory,
    ociClientFactory,
    serverAbortManager,
    ociCredentialsFactory
  });

  // Mock NSG creation and related methods using when().calledWith().thenResolve with explicit arguments
  when(vncClient.createNetworkSecurityGroup)
    .calledWith({
      createNetworkSecurityGroupDetails: {
        compartmentId: "compartment123",
        vcnId: "vnc123",
        displayName: expect.any(String), // serverId is dynamic per test
      }
    })
    .thenResolve({
      networkSecurityGroup: { id: "nsg123" }
    } as any);
  when(vncClient.addNetworkSecurityGroupSecurityRules)
    .calledWith({
      networkSecurityGroupId: "nsg123",
      addNetworkSecurityGroupSecurityRulesDetails: {
        securityRules: [
          expect.objectContaining({
            direction: "INGRESS",
            protocol: "6",
            source: "0.0.0.0/0",
            sourceType: "CIDR_BLOCK",
            tcpOptions: { destinationPortRange: { min: 27015, max: 27020 } },
            udpOptions: undefined,
          }),
          expect.objectContaining({
            direction: "INGRESS",
            protocol: "17",
            source: "0.0.0.0/0",
            sourceType: "CIDR_BLOCK",
            tcpOptions: undefined,
            udpOptions: { destinationPortRange: { min: 27015, max: 27020 } },
          })
        ]
      }
    })
    .thenResolve({
      opcRequestId: "req-123",
      addedNetworkSecurityGroupSecurityRules: []
    } as any);
  when(vncClient.deleteNetworkSecurityGroup)
    .calledWith({ networkSecurityGroupId: "nsg123" })
    .thenResolve({
      opcRequestId: "req-456"
    } as any);
  when(vncClient.listNetworkSecurityGroups)
    .calledWith({
      compartmentId: "compartment123",
      displayName: expect.any(String), // serverId is dynamic per test
      vcnId: "vnc123",
    })
    .thenResolve({
      items: [{ id: "nsg123" }]
    } as any);
  when(vncClient.listNetworkSecurityGroupVnics)
    .calledWith({ networkSecurityGroupId: "nsg123" })
    .thenResolve({
      items: []
    } as any);

  return {
    sut,
    serverCommander,
    configManager,
    tf2ServerConfigFactory,
    containerClient,
    vncClient,
    variantConfig,
    serverAbortManager,
    statusUpdater: vi.fn(),
    loggerSpy: vi.mocked(logger).emit,
  };
}

describe("OCIServerManager", () => {

  describe("deployServer", () => {

    const environment = createTestEnvironment();
    let result: Awaited<ReturnType<typeof environment.sut.deployServer>>;

    beforeAll(async () => {
      // Initial container creation
      result = await environment.sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-id",
        statusUpdater: environment.statusUpdater,
      });
    });

    it("should call statusUpdater 5 times with correct messages", () => {
      expect(environment.statusUpdater).toHaveBeenCalledTimes(5);
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(1, "🛡️ [1/5] Creating SHIELD Firewall...");
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(2, "📦 [2/5] Creating server instance...");
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(3, "🌐 [3/5] Waiting for Server Network Interfaces to be ready...");
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(4, "⏳ [4/5] Waiting for server instance to be **ACTIVE**... This usually takes 2-3 minutes.");
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(5, "🔄 [5/5] Waiting for server to be ready to receive RCON commands...");
    });

    it("should create the correct container instance using TF2ServerConfig data", () => {
      const containerInstanceRequest = environment.containerClient.createContainerInstance.mock.calls[0][0];

      expect(containerInstanceRequest).toEqual({
        createContainerInstanceDetails: {
          displayName: "test-server-id",
          availabilityDomain: "AD-1",
          compartmentId: "compartment123",
          shape: "test-shape",
          shapeConfig: {
            ocpus: 1,
            memoryInGBs: 2,
          },
          containerRestartPolicy: containerinstances.models.ContainerInstance.ContainerRestartPolicy.Always,
          containers: [
            {
              displayName: "test-server-id",
              imageUrl: "test-image",
              arguments: [
                "-enablefakeip",
                "+sv_pure", "1",
                "+maxplayers", "24",
                "+map", "ctf_2fort",
                "+log", "on",
                "+logaddress_add", "logaddress:port",
                "+sv_logsecret", "123456",
              ],
              environmentVariables: {
                SERVER_HOSTNAME: "test Test Server",
                SERVER_PASSWORD: "test-password",
                DEMOS_TF_APIKEY: "test-demo-tf-api-key",
                LOGS_TF_APIKEY: "test-logs-tf-api-key",
                RCON_PASSWORD: "test-password",
                STV_NAME: "Test STV",
                STV_PASSWORD: "test-password",
                ADMIN_LIST: "default_admin,12345678901234567",
                SV_LOGSECRET: "123456",
              },
              securityContext: {
                securityContextType: "LINUX",
                capabilities: {
                  addCapabilities: [containerinstances.models.ContainerCapabilities.AddCapabilities.All],
                }
              }
            },
            {
              displayName: "shield",
              imageUrl: "sonikro/tf2-quickserver-shield:latest",
              environmentVariables: {
                MAXBYTES: "2000000",
                SRCDS_PASSWORD: "test-password",
                NSG_NAME: "test-server-id",
                COMPARTMENT_ID: "compartment123",
                VCN_ID: "vnc123",
                OCI_CONFIG_FILE_CONTENT: Buffer.from("test-config-content").toString("base64"),
                OCI_PRIVATE_KEY_FILE_CONTENT: Buffer.from("test-private-key-content").toString("base64"),
              }
            }
          ],
          vnics: [
            {
              displayName: "vnic-test-server-id",
              subnetId: "subnet123",
              isPublicIpAssigned: true,
              nsgIds: ["nsg123"],
            },
          ],
          imagePullSecrets: [
            {
              secretType: "VAULT",
              registryEndpoint: "docker.io",
              secretId: "ocid1.vaultsecret.oc1.sa-saopaulo-1.test123",
            }
          ],
        },
      });
    });

    it("should include imagePullSecrets with vault configuration", () => {
      const containerInstanceRequest = environment.containerClient.createContainerInstance.mock.calls[0][0];
      const imagePullSecrets = containerInstanceRequest.createContainerInstanceDetails.imagePullSecrets;

      expect(imagePullSecrets).toBeDefined();
      expect(imagePullSecrets).toHaveLength(1);
      expect(imagePullSecrets![0]).toEqual({
        secretType: "VAULT",
        registryEndpoint: "docker.io",
        secretId: "ocid1.vaultsecret.oc1.sa-saopaulo-1.test123",
      });
    });

    it("returns a server object with correct serverId", () => {
      expect(result.serverId).toBe("test-server-id");
    });

    it("sets correct region and variant", () => {
      expect(result.region).toBe(testRegion);
      expect(result.variant).toBe(testVariant);
    });

    it("uses public IP for RCON and TV", () => {
      expect(result.rconAddress).toBe("1.2.3.4");
      expect(result.tvIp).toBe("1.2.3.4");
    });

    it("sets host IP and port", () => {
      expect(result.hostIp).toBe("169.254.173.35");
      expect(result.hostPort).toBe(13768);
    });

    it("includes credentials from TF2ServerConfig", () => {
      expect(result.rconPassword).toBe("test-password");
      expect(result.hostPassword).toBe("test-password");
      expect(result.tvPassword).toBe("test-password");
      expect(result.logSecret).toBe(123456);
    });

    it("passes DeploymentContext to tf2ServerConfigFactory.build", () => {
      expect(environment.tf2ServerConfigFactory.build).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: "test-server-id",
          region: testRegion,
          variantName: testVariant,
          sourcemodAdminSteamId: "12345678901234567",
        }),
        expect.anything(),
        expect.anything(),
      );
    });

    it("should log all messages with serverId attribute", () => {
      // Check that all log messages include the serverId
      expect(environment.loggerSpy).toHaveBeenCalledWith(expect.objectContaining({
        attributes: expect.objectContaining({
          serverId: "test-server-id"
        })
      }));

      // Verify all logger calls have serverId
      const loggerCalls = environment.loggerSpy.mock.calls;
      loggerCalls.forEach((call: any) => {
        expect(call[0]).toEqual(expect.objectContaining({
          attributes: expect.objectContaining({
            serverId: "test-server-id"
          })
        }));
      });
    });
  })

  describe("newrelic-infra sidecar", () => {
    it("should add newrelic-infra container when NEW_RELIC_LICENSE_KEY is set", async () => {
      const { sut, containerClient } = createTestEnvironment();
      const statusUpdater = vi.fn();
      process.env.NEW_RELIC_LICENSE_KEY = "test-newrelic-key";
      await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-newrelic",
        statusUpdater,
      });
      const containerInstanceRequest = containerClient.createContainerInstance.mock.calls[0][0];
      const containers = containerInstanceRequest.createContainerInstanceDetails.containers;
      const newRelicContainer = containers.find((c: any) => c.displayName === "newrelic-infra");
      expect(newRelicContainer).toBeDefined();
      expect(newRelicContainer?.environmentVariables?.NRIA_LICENSE_KEY).toBe("test-newrelic-key");
    });
  });

  describe("deleteServer", () => {
    const environment = createTestEnvironment();

    beforeAll(async () => {

      when(environment.containerClient.listContainerInstances)
        .calledWith({
          compartmentId: "compartment123",
          displayName: "test-server-id",
        })
        .thenResolve({
          containerInstanceCollection: {
            items: [{ id: "test-container-id" }],
          }
        } as any);


      await environment.sut.deleteServer({
        serverId: "test-server-id",
        region: testRegion
      });
    });

    it("should delete the container instance", () => {
      expect(environment.containerClient.deleteContainerInstance).toHaveBeenCalledWith({
        containerInstanceId: "test-container-id",
      });
    });
  });

  describe("NSG security rules", () => {
    it("should create allow all UDP ingress and egress rules for fragmented packets", async () => {
      const { sut, vncClient, statusUpdater } = createTestEnvironment();

      await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "nsg-test-server-id",
        statusUpdater,
      });

      const allCalls = vncClient.addNetworkSecurityGroupSecurityRules.mock.calls;
      const allRules = allCalls.flatMap((call: any) => call[0].addNetworkSecurityGroupSecurityRulesDetails.securityRules);

      const allUdpIngressRule = allRules.find((rule: any) =>
        rule.direction === "INGRESS" &&
        rule.protocol === "17" &&
        rule.source === "0.0.0.0/0" &&
        rule.udpOptions === undefined &&
        rule.description?.includes("UDP fragments")
      );

      const allUdpEgressRule = allRules.find((rule: any) =>
        rule.direction === "EGRESS" &&
        rule.protocol === "17" &&
        rule.destination === "0.0.0.0/0" &&
        rule.udpOptions === undefined &&
        rule.description?.includes("UDP fragments")
      );

      expect(allUdpIngressRule).toBeDefined();
      expect(allUdpEgressRule).toBeDefined();
    });

    it("should create port-specific UDP rules in addition to allow all UDP rules", async () => {
      const { sut, vncClient, statusUpdater } = createTestEnvironment();

      await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "nsg-ports-test-server-id",
        statusUpdater,
      });

      const allCalls = vncClient.addNetworkSecurityGroupSecurityRules.mock.calls;
      const allRules = allCalls.flatMap((call: any) => call[0].addNetworkSecurityGroupSecurityRulesDetails.securityRules);

      const portSpecificUdpRule = allRules.find((rule: any) =>
        rule.direction === "INGRESS" &&
        rule.protocol === "17" &&
        rule.udpOptions?.destinationPortRange?.min === 27015 &&
        rule.udpOptions?.destinationPortRange?.max === 27020
      );

      const allowAllUdpRule = allRules.find((rule: any) =>
        rule.direction === "INGRESS" &&
        rule.protocol === "17" &&
        rule.udpOptions === undefined
      );

      expect(portSpecificUdpRule).toBeDefined();
      expect(allowAllUdpRule).toBeDefined();
    });
  });

  describe("abort server deployment", () => {
    it("should throw an AbortError if the deployment is aborted", async () => {
      const { sut, serverAbortManager, statusUpdater } = createTestEnvironment();

      serverAbortManager.getOrCreate("test-server-id").abort();
      await expect(sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-id",
        statusUpdater: statusUpdater,
      })).rejects.toThrow(new AbortError("Operation aborted"));
    });
  })

});
