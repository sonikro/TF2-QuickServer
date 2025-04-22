import { containerinstances, core } from "oci-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { OracleConfig, Region, RegionConfig, Variant, VariantConfig } from "../../core/domain";
import { ServerCommander } from "../../core/services/ServerCommander";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { OCIServerManager } from "./OCIServerManager";

vi.mock("uuid", () => ({
  v4: () => "test-server-id"
}));

const testRegion = "IAD" as Region;
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
  };

  const regionConfig: RegionConfig = {
    srcdsHostname: "Test Server",
    tvHostname: "Test STV",
    displayName: "Test Region",
  };

  const oracleConfig: OracleConfig = {
    compartment_id: "compartment123",
    regions: {
      [testRegion]: {
        availability_domain: "AD-1",
        subnet_id: "subnet123",
        nsg_id: "nsg123"
      }
    }
  };

  configManager.getVariantConfig.mockReturnValue(variantConfig);
  configManager.getRegionConfig.mockReturnValue(regionConfig);
  configManager.getOracleConfig.mockReturnValue(oracleConfig);

  process.env.DEMOS_TF_APIKEY = "test-demo-tf-api-key";
  process.env.LOGS_TF_APIKEY = "test-logs-tf-api-key";

  const sut = new OCIServerManager({
    serverCommander,
    configManager,
    passwordGenerator,
    ociClientFactory,
  });

  return {
    sut,
    serverCommander,
    configManager,
    passwordGenerator,
    containerClient,
    vncClient,
  };
}

describe("OCIServerManager", () => {

  describe("deployServer", () => {

    const environment = createTestEnvironment();
    let result: Awaited<ReturnType<typeof environment.sut.deployServer>>;

    beforeAll(async () => {
      // Initial container creation
      when(environment.containerClient.createContainerInstance)
        .calledWith(expect.anything())
        .thenResolve(mock({
          containerInstance: { id: "container123" },
        }));

      // WaitUntil #1: containerClient.getContainerInstance → return VNIC ID
      let vnicResolved = false;
      environment.containerClient.getContainerInstance.mockImplementation(async () => {
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
      environment.vncClient.getVnic.mockResolvedValue({
        vnic: {
          publicIp: "1.2.3.4"
        }
      } as any);;

      // WaitUntil #2: container becomes ACTIVE
      let activeResolved = false;
      environment.containerClient.getContainerInstance.mockImplementation(async () => {
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
      when(environment.serverCommander.query)
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

      result = await environment.sut.deployServer({
        region: testRegion,
        variantName: testVariant,
        sourcemodAdminSteamId: "12345678901234567"
      });

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
              ],
              environmentVariables: {
                SERVER_HOSTNAME: "Test Server",
                SERVER_PASSWORD: "test-password",
                DEMOS_TF_APIKEY: "test-demo-tf-api-key",
                LOGS_TF_APIKEY: "test-logs-tf-api-key",
                RCON_PASSWORD: "test-password",
                STV_NAME: "Test STV",
                STV_PASSWORD: "test-password",
                ADMIN_STEAM_ID: "12345678901234567",
              },
            },
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
        region: "IAD" as Region,
      });
    });

    it("should delete the container instance", () => {
      expect(environment.containerClient.deleteContainerInstance).toHaveBeenCalledWith({
        containerInstanceId: "test-container-id",
      });
    });
  });

});
