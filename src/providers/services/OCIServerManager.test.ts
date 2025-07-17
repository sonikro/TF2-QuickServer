import { containerinstances, core } from "oci-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "../../core/domain";
import { AbortError } from "../../core/services/ServerAbortManager";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { DefaultServerAbortManager } from "./DefaultServerAbortManager";
import { OCIServerManager } from "./OCIServerManager";
import { OCICredentialsFactory } from "../../core/services/OCICredentialsFactory";

const testRegion = Region.SA_SAOPAULO_1;
const testVariant = "vanilla" as Variant;

function createTestEnvironment() {
  const serverCommander = mock<ServerCommander>();
  const configManager = mock<ConfigManager>();
  const passwordGenerator = vi.fn().mockReturnValue("test-password");

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
  };

  const oracleConfig: OracleConfig = {
    regions: {
      [testRegion]: {
        availability_domain: "AD-1",
        subnet_id: "subnet123",
        nsg_id: "nsg123",
        compartment_id: "compartment123",
        vnc_id: "vnc123",
      }
    }
  };

  configManager.getVariantConfig.mockReturnValue(variantConfig);
  configManager.getRegionConfig.mockReturnValue(regionConfig);
  configManager.getOracleConfig.mockReturnValue(oracleConfig);

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
    .thenResolve(`hostname: TF2-QuickServer | Virginia @ Sonikro Solutions
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
    passwordGenerator,
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
    passwordGenerator,
    containerClient,
    vncClient,
    variantConfig,
    serverAbortManager,
    statusUpdater: vi.fn(),
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
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(4, "⏳ [4/5] Waiting for server instance to be **ACTIVE**...");
      expect(environment.statusUpdater).toHaveBeenNthCalledWith(5, "🔄 [5/5] Waiting for server to be ready to receive RCON commands...");
    });

    it("should create the correct container instance", () => {
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
                "+sv_pure",
                "1",
                "+maxplayers",
                "24",
                "+map",
                "ctf_2fort",
                "+log",
                "on",
                "+logaddress_add",
                "logaddress:port",
                "+sv_logsecret",
                expect.any(String), // This will be set later
              ],
              environmentVariables: {
                SERVER_HOSTNAME: "Test Server",
                SERVER_PASSWORD: "test-password",
                DEMOS_TF_APIKEY: "test-demo-tf-api-key",
                LOGS_TF_APIKEY: "test-logs-tf-api-key",
                RCON_PASSWORD: "test-password",
                STV_NAME: "Test STV",
                STV_PASSWORD: "test-password",
                ADMIN_LIST: "default_admin,12345678901234567",
                SV_LOGSECRET: expect.any(String), // This will be set later
              },
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
        },
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

    it("includes generated passwords", () => {
      expect(result.rconPassword).toBe("test-password");
      expect(result.hostPassword).toBe("test-password");
      expect(result.tvPassword).toBe("test-password");
    });
  })

  describe("custom variant hostname", () => {
    it("should use the variant hostname if provided", async () => {
      const { sut, containerClient, variantConfig } = createTestEnvironment();
      const statusUpdater = vi.fn();
      variantConfig.hostname = "custom-hostname | {region} @ TF2-QuickServer";
      // When
      const result = await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-id",
        statusUpdater,
      });
      // Then
      const containerInstanceRequest = containerClient.createContainerInstance.mock.calls[0][0];
      expect(containerInstanceRequest).toEqual(expect.objectContaining({
        createContainerInstanceDetails: expect.objectContaining({
          containers: [
            expect.objectContaining({
              environmentVariables: expect.objectContaining({
                SERVER_HOSTNAME: `custom-hostname | São Paulo (Brazil) @ TF2-QuickServer`,
              }),
            }),
            expect.anything(),
          ],
        }),
      }));
    });
  });

  describe("extra vars", () => {
    it("should include extraEnvs in the container environment variables", async () => {
      const { sut, containerClient } = createTestEnvironment();
      const statusUpdater = vi.fn();
      await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-extra-env",
        extraEnvs: {
          CUSTOM_ENV_VAR: "custom-value",
          ANOTHER_VAR: "another-value"
        },
        statusUpdater,
      });
      const containerInstanceRequest = containerClient.createContainerInstance.mock.calls[0][0];
      const envVars = containerInstanceRequest.createContainerInstanceDetails.containers[0].environmentVariables!;
      expect(envVars.CUSTOM_ENV_VAR).toBe("custom-value");
      expect(envVars.ANOTHER_VAR).toBe("another-value");
    });
  });
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

  describe("no default admins", () => {
    it("should use the sourcemodAdminSteamId as the only admin", async () => {
      const { sut, containerClient, variantConfig } = createTestEnvironment();
      const statusUpdater = vi.fn();
      variantConfig.admins = undefined;
      await sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567",
        serverId: "test-server-id",
        statusUpdater,
      });
      const containerInstanceRequest = containerClient.createContainerInstance.mock.calls[0][0];
      const containers = containerInstanceRequest.createContainerInstanceDetails.containers;
      const tf2Container = containers.find((c: any) => c.displayName === "test-server-id");
      expect(tf2Container?.environmentVariables?.ADMIN_LIST).toBe("12345678901234567");
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