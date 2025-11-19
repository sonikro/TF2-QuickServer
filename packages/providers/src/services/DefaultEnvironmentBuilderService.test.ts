import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Region, RegionConfig, VariantConfig, getRegionDisplayName } from "@tf2qs/core/src/domain";
import { DeploymentContext } from "@tf2qs/core/src/models/DeploymentContext";
import { ServerCredentials } from "@tf2qs/core/src/models/ServerCredentials";
import { DefaultEnvironmentBuilderService } from "./DefaultEnvironmentBuilderService";

// Mock the getRegionDisplayName function
vi.mock("@tf2qs/core/src/domain", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tf2qs/core/src/domain")>();
    return {
        ...actual,
        getRegionDisplayName: vi.fn()
    };
});

const chance = new Chance();

describe("DefaultEnvironmentBuilderService", () => {
    let service: DefaultEnvironmentBuilderService;
    let mockGetRegionDisplayName: any;

    const createTestData = () => {
        const serverCredentials = new ServerCredentials({
            serverPassword: chance.string({ length: 10 }),
            rconPassword: chance.string({ length: 10 }),
            tvPassword: chance.string({ length: 10 }),
            logSecret: chance.integer({ min: 1, max: 999999 })
        });

        const deploymentContext = new DeploymentContext({
            serverId: `${chance.guid()}-${chance.guid()}`,
            region: Region.US_EAST_1_BUE_1,
            variantName: "test-variant",
            statusUpdater: vi.fn(),
            sourcemodAdminSteamId: chance.string({ length: 17, pool: "0123456789" }),
            extraEnvs: {
                CUSTOM_VAR: "custom_value",
                ANOTHER_VAR: "another_value"
            }
        });

        const variantConfig: VariantConfig = {
            displayName: "Test Variant",
            image: "test-image",
            hostname: "Test Server - {region}",
            ocpu: 1,
            memory: 2,
            maxPlayers: 24,
            serverName: "Test Server",
            map: "ctf_2fort",
            svPure: 1,
            shape: "test-shape",
            defaultCfgs: {
                "5cp": "exec 5cp.cfg",
                "koth": "exec koth.cfg",
                "pl": "exec pl.cfg",
                "ultiduo": "exec ultiduo.cfg"
            },
            admins: Object.freeze(["admin1", "admin2"])
        };

        const regionConfig: RegionConfig = {
            displayName: "Buenos Aires",
            srcdsHostname: "Test Region Server",
            tvHostname: "Test STV",
            cloudProvider: "aws" as any
        };

        return {
            serverCredentials,
            deploymentContext,
            variantConfig,
            regionConfig
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        service = new DefaultEnvironmentBuilderService();
        mockGetRegionDisplayName = vi.mocked(getRegionDisplayName);
        
        // Setup environment variables
        process.env.DEMOS_TF_APIKEY = "test-demos-key";
        process.env.LOGS_TF_APIKEY = "test-logs-key";
    });

    describe("build", () => {
        it("should build environment variables with all required fields", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantConfig, regionConfig);

            const expectedUuidPrefix = deploymentContext.serverId.split('-')[0];
            const expectedHostname = `#${expectedUuidPrefix} Test Server - Buenos Aires`;

            expect(result).toEqual({
                SERVER_HOSTNAME: expectedHostname,
                SERVER_PASSWORD: serverCredentials.serverPassword,
                DEMOS_TF_APIKEY: "test-demos-key",
                LOGS_TF_APIKEY: "test-logs-key",
                RCON_PASSWORD: serverCredentials.rconPassword,
                STV_NAME: regionConfig.tvHostname,
                STV_PASSWORD: serverCredentials.tvPassword,
                ADMIN_LIST: `admin1,admin2,${deploymentContext.sourcemodAdminSteamId}`,
                SV_LOGSECRET: serverCredentials.logSecret.toString(),
                DEFAULT_5CP_CFG: "exec 5cp.cfg",
                DEFAULT_KOTH_CFG: "exec koth.cfg",
                DEFAULT_PL_CFG: "exec pl.cfg",
                DEFAULT_ULTIDUO_CFG: "exec ultiduo.cfg",
                CUSTOM_VAR: "custom_value",
                ANOTHER_VAR: "another_value"
            });

            expect(mockGetRegionDisplayName).toHaveBeenCalledWith(deploymentContext.region);
        });

        it("should handle missing DEMOS_TF_APIKEY environment variable", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");
            delete process.env.DEMOS_TF_APIKEY;

            const result = service.build(deploymentContext, serverCredentials, variantConfig, regionConfig);

            expect(result.DEMOS_TF_APIKEY).toBe("");
        });

        it("should handle missing LOGS_TF_APIKEY environment variable", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");
            delete process.env.LOGS_TF_APIKEY;

            const result = service.build(deploymentContext, serverCredentials, variantConfig, regionConfig);

            expect(result.LOGS_TF_APIKEY).toBe("");
        });

        it("should use regionConfig hostname when variantConfig hostname is not provided", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const variantWithoutHostname = { ...variantConfig, hostname: undefined };
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantWithoutHostname, regionConfig);

            const expectedUuidPrefix = deploymentContext.serverId.split('-')[0];
            const expectedHostname = `#${expectedUuidPrefix} ${regionConfig.srcdsHostname}`;

            expect(result.SERVER_HOSTNAME).toBe(expectedHostname);
        });

        it("should handle variant config without defaultCfgs", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const variantWithoutDefaultCfgs = { ...variantConfig, defaultCfgs: undefined };
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantWithoutDefaultCfgs, regionConfig);

            // Should not have any DEFAULT_*_CFG variables
            const defaultCfgKeys = Object.keys(result).filter(key => key.startsWith('DEFAULT_') && key.endsWith('_CFG'));
            expect(defaultCfgKeys).toHaveLength(0);
        });

        it("should handle variant config without admins", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const variantWithoutAdmins = { ...variantConfig, admins: undefined };
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantWithoutAdmins, regionConfig);

            expect(result.ADMIN_LIST).toBe(deploymentContext.sourcemodAdminSteamId);
        });

        it("should handle deployment context without sourcemodAdminSteamId", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const contextWithoutAdmin = new DeploymentContext({
                ...deploymentContext,
                sourcemodAdminSteamId: undefined
            });
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(contextWithoutAdmin, serverCredentials, variantConfig, regionConfig);

            expect(result.ADMIN_LIST).toBe("admin1,admin2");
        });

        it("should handle variant admins with null/undefined values", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const variantWithNullAdmins = {
                ...variantConfig,
                admins: Object.freeze(["admin1", null, "admin2", undefined, "admin3"])
            } as any;
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantWithNullAdmins, regionConfig);

            expect(result.ADMIN_LIST).toBe(`admin1,admin2,admin3,${deploymentContext.sourcemodAdminSteamId}`);
        });

        it("should properly convert defaultCfgs keys to uppercase environment variables", () => {
            const { serverCredentials, deploymentContext, variantConfig, regionConfig } = createTestData();
            const variantWithMixedCaseCfgs = {
                ...variantConfig,
                defaultCfgs: {
                    "5cp": "exec 5cp.cfg",
                    "koth": "exec koth.cfg", 
                    "pl": "exec pl.cfg",
                    "ultiduo": "exec ultiduo.cfg",
                    "custom_map": "exec custom.cfg",
                    "another-map": "exec another.cfg",
                    "CamelCase": "exec camel.cfg"
                }
            };
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantWithMixedCaseCfgs, regionConfig);

            expect(result.DEFAULT_CUSTOM_MAP_CFG).toBe("exec custom.cfg");
            expect(result["DEFAULT_ANOTHER-MAP_CFG"]).toBe("exec another.cfg");
            expect(result.DEFAULT_CAMELCASE_CFG).toBe("exec camel.cfg");
        });

        it("should extract UUID prefix correctly from serverId", () => {
            const { serverCredentials, variantConfig, regionConfig } = createTestData();
            const testServerId = "abc123-def456-ghi789";
            const deploymentContext = new DeploymentContext({
                serverId: testServerId,
                region: Region.US_EAST_1_BUE_1,
                variantName: "test-variant",
                statusUpdater: vi.fn(),
                sourcemodAdminSteamId: "12345",
                extraEnvs: {}
            });
            mockGetRegionDisplayName.mockReturnValue("Buenos Aires");

            const result = service.build(deploymentContext, serverCredentials, variantConfig, regionConfig);

            expect(result.SERVER_HOSTNAME).toBe("#abc123 Test Server - Buenos Aires");
        });
    });
});
