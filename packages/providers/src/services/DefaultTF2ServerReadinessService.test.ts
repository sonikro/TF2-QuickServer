import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerStatusParser } from "@tf2qs/core";
import { ServerCommander } from "@tf2qs/core";
import { waitUntil } from "../utils/waitUntil";
import { DefaultTF2ServerReadinessService } from "./DefaultTF2ServerReadinessService";

// Mock dependencies
vi.mock("../utils/waitUntil");
vi.mock("@tf2qs/core");
vi.mock("@tf2qs/telemetry", () => ({
    logger: {
        emit: vi.fn()
    }
}));

const chance = new Chance();

describe("DefaultTF2ServerReadinessService", () => {
    let service: DefaultTF2ServerReadinessService;
    let mockServerCommander: ServerCommander;
    let mockWaitUntil: any;
    let mockServerStatusParser: any;

    const createTestData = () => ({
        publicIp: chance.ip(),
        rconPassword: chance.string({ length: 10 }),
        serverId: chance.guid(),
        port: 27015,
        timeout: 5000
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockServerCommander = {
            query: vi.fn()
        } as unknown as ServerCommander;
        mockWaitUntil = vi.mocked(waitUntil);
        mockServerStatusParser = vi.mocked(ServerStatusParser);

        service = new DefaultTF2ServerReadinessService(mockServerCommander);
    });

    describe("constructor", () => {
        it("should create an instance with ServerCommander dependency", () => {
            expect(service).toBeInstanceOf(DefaultTF2ServerReadinessService);
        });
    });

    describe("waitForReady", () => {
        it("should wait for server to be ready and return sdrAddress", async () => {
            const testData = createTestData();
            const mockServerResponse = `hostname: Test Server
udp/ip  : 192.168.1.100:27015  
sourcetv: 192.168.1.100:27020
players : 0 humans, 0 bots (24 max)`;

            const mockStatusInstance = {
                serverIp: "192.168.1.100",
                serverPort: 27015,
                sourceTVIp: "192.168.1.100"
            };

            vi.mocked(mockServerCommander.query).mockResolvedValue(mockServerResponse);
            mockServerStatusParser.mockImplementation(() => mockStatusInstance);
            mockWaitUntil.mockImplementation(async (conditionFn: () => Promise<any>) => {
                return await conditionFn();
            });

            const result = await service.waitForReady(
                testData.publicIp,
                testData.rconPassword,
                testData.serverId
            );

            expect(vi.mocked(mockServerCommander.query)).toHaveBeenCalledWith({
                command: "status",
                host: testData.publicIp,
                password: testData.rconPassword,
                port: 27015,
                timeout: 5000
            });

            expect(mockServerStatusParser).toHaveBeenCalledWith(mockServerResponse);
            expect(result).toBe("192.168.1.100:27015");
        });

        it("should pass through abort signal to waitUntil", async () => {
            const testData = createTestData();
            const abortController = new AbortController();
            const abortSignal = abortController.signal;

            mockWaitUntil.mockResolvedValue({ sdrAddress: "192.168.1.100:27015" });

            await service.waitForReady(
                testData.publicIp,
                testData.rconPassword,
                testData.serverId,
                abortSignal
            );

            expect(mockWaitUntil).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    timeout: 300000,
                    interval: 5000,
                    signal: abortSignal
                }
            );
        });

        it("should throw error when server is not ready (no sourceTVIp)", async () => {
            const testData = createTestData();
            const mockServerResponse = `hostname: Test Server
udp/ip  : 192.168.1.100:27015
players : 0 humans, 0 bots (24 max)`;

            const mockStatusInstance = {
                serverIp: "192.168.1.100",
                serverPort: 27015,
                sourceTVIp: null // Server not ready
            };

            vi.mocked(mockServerCommander.query).mockResolvedValue(mockServerResponse);
            mockServerStatusParser.mockImplementation(() => mockStatusInstance);
            mockWaitUntil.mockImplementation(async (conditionFn: () => Promise<any>) => {
                try {
                    return await conditionFn();
                } catch (error) {
                    throw new Error(`Timeout after 300000ms: ${error}`);
                }
            });

            await expect(service.waitForReady(
                testData.publicIp,
                testData.rconPassword,
                testData.serverId
            )).rejects.toThrow("Timeout after 300000ms: Error: Server is not ready yet");
        });

        it("should retry until server becomes ready", async () => {
            const testData = createTestData();
            const mockServerResponse = `hostname: Test Server
udp/ip  : 192.168.1.100:27015
sourcetv: 192.168.1.100:27020
players : 0 humans, 0 bots (24 max)`;

            const mockStatusInstanceNotReady = {
                serverIp: "192.168.1.100",
                serverPort: 27015,
                sourceTVIp: null
            };

            const mockStatusInstanceReady = {
                serverIp: "192.168.1.100",
                serverPort: 27015,
                sourceTVIp: "192.168.1.100"
            };

            let attemptCount = 0;
            vi.mocked(mockServerCommander.query).mockResolvedValue(mockServerResponse);
            mockServerStatusParser.mockImplementation(() => {
                attemptCount++;
                return attemptCount < 3 ? mockStatusInstanceNotReady : mockStatusInstanceReady;
            });
            
            mockWaitUntil.mockImplementation(async (conditionFn: () => Promise<any>) => {
                // Simulate retries
                for (let i = 0; i < 3; i++) {
                    try {
                        return await conditionFn();
                    } catch (error) {
                        if (i === 2) throw error; // Throw on last attempt
                    }
                }
            });

            const result = await service.waitForReady(
                testData.publicIp,
                testData.rconPassword,
                testData.serverId
            );

            expect(result).toBe("192.168.1.100:27015");
            expect(mockServerStatusParser).toHaveBeenCalledTimes(3);
        });

        it("should create correct sdrAddress from serverIp and serverPort", async () => {
            const testData = createTestData();
            const mockServerResponse = "test response";

            const mockStatusInstance = {
                serverIp: "10.0.0.5",
                serverPort: 27020,
                sourceTVIp: "10.0.0.5"
            };

            vi.mocked(mockServerCommander.query).mockResolvedValue(mockServerResponse);
            mockServerStatusParser.mockImplementation(() => mockStatusInstance);
            mockWaitUntil.mockImplementation(async (conditionFn: () => Promise<any>) => {
                return await conditionFn();
            });

            const result = await service.waitForReady(
                testData.publicIp,
                testData.rconPassword,
                testData.serverId
            );

            expect(result).toBe("10.0.0.5:27020");
        });
    });
});
