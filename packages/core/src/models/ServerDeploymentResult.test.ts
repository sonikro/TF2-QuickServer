import { describe, it, expect } from "vitest";
import { Chance } from "chance";
import { ServerDeploymentResult } from "./ServerDeploymentResult";

const chance = new Chance();

describe("ServerDeploymentResult", () => {
    const createTestEnvironment = () => {
        const testData = {
            serverId: chance.guid(),
            publicIp: chance.ip(),
            rconPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            serverPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            tvPassword: chance.string({ length: 10, alpha: true, numeric: true }),
            sdrAddress: `${chance.ip()}:${chance.integer({ min: 1024, max: 65535 })}`
        };

        return {
            data: testData
        };
    };

    describe("constructor", () => {
        it("should create ServerDeploymentResult with all required properties", () => {
            const { data } = createTestEnvironment();

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: data.sdrAddress
            });

            expect(result.serverId).toBe(data.serverId);
            expect(result.publicIp).toBe(data.publicIp);
            expect(result.rconPassword).toBe(data.rconPassword);
            expect(result.serverPassword).toBe(data.serverPassword);
            expect(result.tvPassword).toBe(data.tvPassword);
            expect(result.sdrAddress).toBe(data.sdrAddress);
        });

    });

    describe("sdr getters", () => {
        it("should extract host from sdrAddress correctly", () => {
            const { data } = createTestEnvironment();
            const testHost = "192.168.1.100";
            const testPort = "27015";
            const sdrAddress = `${testHost}:${testPort}`;

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: sdrAddress
            });

            expect(result.sdrHost).toBe(testHost);
            expect(result.sdrPort).toBe(Number(testPort));
        });

    });

    describe("rconPort getter", () => {
        it("should always return 27015", () => {
            const { data } = createTestEnvironment();

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: data.sdrAddress
            });

            expect(result.rconPort).toBe(27015);
        });

        it("should return 27015 regardless of sdrAddress port", () => {
            const { data } = createTestEnvironment();
            const customSdrAddress = "192.168.1.100:12345";

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: customSdrAddress
            });

            expect(result.rconPort).toBe(27015);
            expect(result.sdrPort).toBe(12345);
        });
    });

    describe("tvPort getter", () => {
        it("should always return 27020", () => {
            const { data } = createTestEnvironment();

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: data.sdrAddress
            });

            expect(result.tvPort).toBe(27020);
        });

        it("should return 27020 regardless of other ports", () => {
            const { data } = createTestEnvironment();
            const customSdrAddress = "192.168.1.100:12345";

            const result = new ServerDeploymentResult({
                serverId: data.serverId,
                publicIp: data.publicIp,
                rconPassword: data.rconPassword,
                serverPassword: data.serverPassword,
                tvPassword: data.tvPassword,
                sdrAddress: customSdrAddress
            });

            expect(result.tvPort).toBe(27020);
            expect(result.rconPort).toBe(27015);
            expect(result.sdrPort).toBe(12345);
        });
    });
});
