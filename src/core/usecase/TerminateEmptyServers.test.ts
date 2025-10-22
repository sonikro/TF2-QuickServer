import { beforeAll, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerActivity } from "../domain/ServerActivity";
import { TerminateEmptyServers } from "./TerminateEmptyServers";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { Region, Server, Variant, VariantConfig } from "../domain";
import { Chance } from "chance";
import { when } from "vitest-when";
import { ServerCommander } from "../services/ServerCommander";
import { emptyServerStatus, nonEmptyServerStatus } from "./__tests__/mockStatusStrings";
import { EventLogger } from "../services/EventLogger";
import { ConfigManager } from "../utils/ConfigManager";
import { Knex } from "knex";
import { BackgroundTaskQueue } from "../services/BackgroundTaskQueue";

const chance = new Chance();

function createTestEnvironment() {
    const serverRepository = mock<ServerRepository>();
    const serverActivityRepository = mock<ServerActivityRepository>();
    const serverCommander = mock<ServerCommander>();
    const eventLogger = mock<EventLogger>();
    const configManager = mock<ConfigManager>();
    const backgroundTaskQueue = mock<BackgroundTaskQueue>();

    const sut = new TerminateEmptyServers({
        serverRepository,
        serverActivityRepository,
        serverCommander,
        eventLogger,
        configManager,
        backgroundTaskQueue
    });

    return {
        sut,
        mocks: {
            serverRepository,
            serverActivityRepository,
            serverCommander,
            eventLogger,
            configManager,
            backgroundTaskQueue
        }
    };
}

function createServer(server: Partial<Server> = {}): Server {
    return {
        hostIp: chance.ip(),
        hostPort: chance.integer(),
        serverId: chance.guid(),
        rconAddress: chance.ip(),
        rconPassword: chance.string(),
        tvIp: chance.ip(),
        tvPort: chance.integer(),
        tvPassword: chance.string(),
        region: chance.pickone(Object.values(Region)),
        variant: chance.pickone(["standard-competitive", "casual"]),
        status: "ready",
        createdBy: chance.guid(),
        ...server
    };
}

describe("TerminateEmptyServers", () => {
    describe("1 empty server for 10 minutes and 4 others in various states", () => {
        const { sut, mocks } = createTestEnvironment();

        // Create a mock transaction object to use consistently
        const mockTransaction =  mock<Knex.Transaction>()

        const emptyServerToBeTerminated = createServer();
        const serverWithActivity = createServer();
        const emptyServerStillWaiting = createServer();
        const serverWithError = createServer();
        const noLongerEmptyServer = createServer();

        const currentServers: Server[] = [
            emptyServerToBeTerminated,
            serverWithActivity,
            emptyServerStillWaiting,
            serverWithError,
            noLongerEmptyServer
        ];

        const serverActivities: ServerActivity[] = [
            {
                serverId: emptyServerToBeTerminated.serverId,
                emptySince: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                lastCheckedAt: new Date(),
            },
            {
                serverId: serverWithActivity.serverId,
                emptySince: null,
                lastCheckedAt: new Date(),
            },
            {
                serverId: emptyServerStillWaiting.serverId,
                emptySince: null,
                lastCheckedAt: new Date(),
            },
            {
                serverId: serverWithError.serverId,
                emptySince: null,
                lastCheckedAt: new Date(),
            },
            {
                serverId: noLongerEmptyServer.serverId,
                emptySince: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                lastCheckedAt: new Date(),
            }
        ];

        function mockQuery(server: Server, result: string | Error) {
            const queryParams = {
                command: "status",
                host: server.rconAddress,
                password: server.rconPassword,
                port: 27015,
                timeout: 5000,
            };
            if (result instanceof Error) {
                when(mocks.serverCommander.query).calledWith(queryParams).thenReject(result);
            } else {
                when(mocks.serverCommander.query).calledWith(queryParams).thenResolve(result);
            }
        }

        beforeAll(async () => {
            // Mock runInTransaction to execute the callback function for all calls
            mocks.serverRepository.runInTransaction.mockImplementation(async (callback: any) => {
                return await callback(mockTransaction);
            });

            // Mock findById to return existing server for all transaction checks
            mocks.serverRepository.findById.mockResolvedValue(emptyServerToBeTerminated);

            when(mocks.serverActivityRepository.getAll).calledWith(mockTransaction).thenResolve(serverActivities);
            when(mocks.serverRepository.getAllServers).calledWith("ready", mockTransaction).thenResolve(currentServers);

            // Mock configManager.getVariantConfig
            for (const server of currentServers) {
                when(mocks.configManager.getVariantConfig)
                    .calledWith(server.variant)
                    .thenReturn({ emptyMinutesTerminate: 10 } as VariantConfig);
            }

            // Mock RCON query results
            mockQuery(serverWithActivity, nonEmptyServerStatus);
            mockQuery(emptyServerStillWaiting, emptyServerStatus);
            mockQuery(serverWithError, new Error("Server not responding"));
            mockQuery(noLongerEmptyServer, nonEmptyServerStatus);

            await sut.execute();
        });

        it("should terminate the empty server", async () => {
            expect(mocks.backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
                'delete-server',
                { serverId: emptyServerToBeTerminated.serverId },
                expect.any(Object)
            );
        });

        it("should not terminate any of the other servers", async () => {
            const notTerminated = [
                serverWithActivity,
                emptyServerStillWaiting,
                serverWithError,
                noLongerEmptyServer
            ];
            for (const server of notTerminated) {
                expect(mocks.backgroundTaskQueue.enqueue).not.toHaveBeenCalledWith(
                    'delete-server',
                    { serverId: server.serverId },
                    expect.any(Object)
                );
            }
        });

        it("should delete the terminated server from the repository", async () => {
            expect(mocks.backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
                'delete-server',
                { serverId: emptyServerToBeTerminated.serverId },
                expect.any(Object)
            );
        });

        it("should keep the server with activity as emptySince = null", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithActivity.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });

        it("should set emptySince to now for a server that is just now empty", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: emptyServerStillWaiting.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });

        it("should set emptySince for a server that is not responding", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithError.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });

        it("should set emptySince to null for a server that is no longer empty", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: noLongerEmptyServer.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });
    });

    describe("Server with repeated status query failures should preserve emptySince timestamp", () => {
        const { sut, mocks } = createTestEnvironment();
        const mockTransaction = mock<Knex.Transaction>();

        const serverWithRepeatedFailures = createServer();

        const currentServers: Server[] = [serverWithRepeatedFailures];

        // Server has been empty for just 5 minutes (should NOT be terminated yet)
        const initialEmptySince = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
        const serverActivities: ServerActivity[] = [
            {
                serverId: serverWithRepeatedFailures.serverId,
                emptySince: initialEmptySince, 
                lastCheckedAt: new Date(),
            }
        ];

        beforeAll(async () => {
            // Mock runInTransaction to execute the callback function for all calls
            mocks.serverRepository.runInTransaction.mockImplementation(async (callback: any) => {
                return await callback(mockTransaction);
            });

            // Mock findById to return existing server for all transaction checks
            mocks.serverRepository.findById.mockResolvedValue(serverWithRepeatedFailures);

            when(mocks.serverActivityRepository.getAll).calledWith(mockTransaction).thenResolve(serverActivities);
            when(mocks.serverRepository.getAllServers).calledWith("ready", mockTransaction).thenResolve(currentServers);

            // Mock configManager.getVariantConfig
            when(mocks.configManager.getVariantConfig)
                .calledWith(serverWithRepeatedFailures.variant)
                .thenReturn({ emptyMinutesTerminate: 10 } as VariantConfig);

            // Mock RCON query to always fail
            const queryParams = {
                command: "status",
                host: serverWithRepeatedFailures.rconAddress,
                password: serverWithRepeatedFailures.rconPassword,
                port: 27015,
                timeout: 5000,
            };
            when(mocks.serverCommander.query).calledWith(queryParams).thenReject(new Error("Server not responding"));

            await sut.execute();
        });

        it("should NOT terminate the server since it has only been empty for 5 minutes", async () => {
            expect(mocks.backgroundTaskQueue.enqueue).not.toHaveBeenCalledWith(
                'delete-server',
                { serverId: serverWithRepeatedFailures.serverId },
                expect.any(Object)
            );
        });

        it("should preserve the original emptySince timestamp when status queries fail", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithRepeatedFailures.serverId,
                emptySince: initialEmptySince, // Shouldnt change
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });
    });

    describe("Server with first-time status query failure should set emptySince", () => {
        const { sut, mocks } = createTestEnvironment();
        const mockTransaction = mock<Knex.Transaction>();

        const serverWithFirstTimeFailure = createServer();

        const currentServers: Server[] = [serverWithFirstTimeFailure];

        // Server has never been empty before (emptySince is null)
        const serverActivities: ServerActivity[] = [
            {
                serverId: serverWithFirstTimeFailure.serverId,
                emptySince: null, 
                lastCheckedAt: new Date(),
            }
        ];

        beforeAll(async () => {
            // Mock runInTransaction to execute the callback function for all calls
            mocks.serverRepository.runInTransaction.mockImplementation(async (callback: any) => {
                return await callback(mockTransaction);
            });

            // Mock findById to return existing server for all transaction checks
            mocks.serverRepository.findById.mockResolvedValue(serverWithFirstTimeFailure);

            when(mocks.serverActivityRepository.getAll).calledWith(mockTransaction).thenResolve(serverActivities);
            when(mocks.serverRepository.getAllServers).calledWith("ready", mockTransaction).thenResolve(currentServers);

            // Mock configManager.getVariantConfig
            when(mocks.configManager.getVariantConfig)
                .calledWith(serverWithFirstTimeFailure.variant)
                .thenReturn({ emptyMinutesTerminate: 10 } as VariantConfig);

            // Mock RCON query to fail
            const queryParams = {
                command: "status",
                host: serverWithFirstTimeFailure.rconAddress,
                password: serverWithFirstTimeFailure.rconPassword,
                port: 27015,
                timeout: 5000,
            };
            when(mocks.serverCommander.query).calledWith(queryParams).thenReject(new Error("Server not responding"));

            await sut.execute();
        });

        it("should set emptySince for the first time when status query fails", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithFirstTimeFailure.serverId,
                emptySince: expect.any(Date), // Should be set to current time
                lastCheckedAt: expect.any(Date)
            }, mockTransaction);
        });
    });
});
