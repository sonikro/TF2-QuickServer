import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudProvider, Region, Variant } from "@tf2qs/core";
import { DeploymentContext } from "@tf2qs/core";
import { EnvironmentBuilderService } from "@tf2qs/core";
import { PasswordGeneratorService } from "@tf2qs/core";
import { RegionConfig, VariantConfig } from "@tf2qs/core";
import { DefaultTF2ServerConfigFactory } from "./DefaultTF2ServerConfigFactory";

const mockPasswordGeneratorService: PasswordGeneratorService = {
    generatePassword: vi.fn().mockReturnValue("test-password"),
    generateNumericPassword: vi.fn().mockReturnValue(123456),
};

const mockEnvironmentBuilderService: EnvironmentBuilderService = {
    build: vi.fn().mockReturnValue({
        SERVER_HOSTNAME: "abcd1234 Test Server",
        SERVER_PASSWORD: "test-password",
        RCON_PASSWORD: "test-password",
        STV_PASSWORD: "test-password",
        ADMIN_LIST: "default_admin,12345678901234567",
        SV_LOGSECRET: "123456",
    }),
};

const variantConfig: VariantConfig = {
    image: "test-image:latest",
    shape: "VM.Standard.E4.Flex",
    ocpu: 2,
    memory: 8,
    svPure: 1,
    maxPlayers: 24,
    map: "ctf_2fort",
    serverName: "Test Server",
    admins: Object.freeze(["default_admin"]),
};

const regionConfig: RegionConfig = {
    srcdsHostname: "Test Server",
    tvHostname: "Test STV",
    displayName: "Test Region",
    cloudProvider: CloudProvider.ORACLE,
};

function makeContext(overrides: Partial<ConstructorParameters<typeof DeploymentContext>[0]> = {}) {
    return new DeploymentContext({
        serverId: "abcd1234-5678-9012-3456-789012345678",
        region: Region.SA_SAOPAULO_1,
        variantName: "vanilla" as Variant,
        statusUpdater: vi.fn(),
        ...overrides,
    });
}

describe("DefaultTF2ServerConfigFactory", () => {
    let factory: DefaultTF2ServerConfigFactory;

    beforeEach(() => {
        vi.clearAllMocks();
        factory = new DefaultTF2ServerConfigFactory(
            mockPasswordGeneratorService,
            mockEnvironmentBuilderService,
        );
        process.env.SRCDS_LOG_ADDRESS = "logserver:1234";
    });

    describe("credentials", () => {
        it("generates credentials via ServerCredentials.generate", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.credentials.serverPassword).toBe("test-password");
            expect(config.credentials.rconPassword).toBe("test-password");
            expect(config.credentials.tvPassword).toBe("test-password");
            expect(config.credentials.logSecret).toBe(123456);
        });

        it("passes credentials to EnvironmentBuilderService", async () => {
            const context = makeContext();
            await factory.build(context, variantConfig, regionConfig);
            expect(mockEnvironmentBuilderService.build).toHaveBeenCalledWith(
                context,
                expect.objectContaining({
                    serverPassword: "test-password",
                    rconPassword: "test-password",
                    tvPassword: "test-password",
                    logSecret: 123456,
                }),
                variantConfig,
                regionConfig,
            );
        });
    });

    describe("environmentVariables", () => {
        it("returns the environment built by EnvironmentBuilderService", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.environmentVariables).toEqual(expect.objectContaining({
                SERVER_HOSTNAME: "abcd1234 Test Server",
                ADMIN_LIST: "default_admin,12345678901234567",
            }));
        });

        it("passes extraEnvs via context to EnvironmentBuilderService", async () => {
            const context = makeContext({ extraEnvs: { CUSTOM_VAR: "custom-value" } });
            await factory.build(context, variantConfig, regionConfig);
            expect(mockEnvironmentBuilderService.build).toHaveBeenCalledWith(
                expect.objectContaining({ extraEnvs: { CUSTOM_VAR: "custom-value" } }),
                expect.anything(),
                variantConfig,
                regionConfig,
            );
        });
    });

    describe("containerImage", () => {
        it("uses variant image", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.containerImage).toBe("test-image:latest");
        });
    });

    describe("startupMap", () => {
        it("defaults to variant map", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.startupMap).toBe("ctf_2fort");
        });

        it("uses firstMap override when provided", async () => {
            const context = makeContext({ firstMap: "cp_badlands" });
            const config = await factory.build(context, variantConfig, regionConfig);
            expect(config.startupMap).toBe("cp_badlands");
        });
    });

    describe("maxPlayers and svPure", () => {
        it("reads maxPlayers from variantConfig", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.maxPlayers).toBe(24);
        });

        it("reads svPure from variantConfig", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.svPure).toBe(1);
        });
    });

    describe("containerArgs", () => {
        it("includes -enablefakeip", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            expect(config.containerArgs).toContain("-enablefakeip");
        });

        it("includes +sv_pure with svPure value", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+sv_pure");
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(config.containerArgs[idx + 1]).toBe("1");
        });

        it("includes +maxplayers with maxPlayers value", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+maxplayers");
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(config.containerArgs[idx + 1]).toBe("24");
        });

        it("includes +map with startup map", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+map");
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(config.containerArgs[idx + 1]).toBe("ctf_2fort");
        });

        it("uses firstMap in +map arg when provided", async () => {
            const context = makeContext({ firstMap: "cp_granary_pro" });
            const config = await factory.build(context, variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+map");
            expect(config.containerArgs[idx + 1]).toBe("cp_granary_pro");
        });

        it("includes +logaddress_add with SRCDS_LOG_ADDRESS env var", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+logaddress_add");
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(config.containerArgs[idx + 1]).toBe("logserver:1234");
        });

        it("includes +sv_logsecret with logSecret from credentials", async () => {
            const config = await factory.build(makeContext(), variantConfig, regionConfig);
            const idx = config.containerArgs.indexOf("+sv_logsecret");
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(config.containerArgs[idx + 1]).toBe("123456");
        });
    });
});
