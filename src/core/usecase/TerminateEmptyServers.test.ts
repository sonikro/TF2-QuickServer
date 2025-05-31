import { beforeAll, describe, expect, it } from "vitest";
import { ServerManager } from "../services/ServerManager";
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
import { Client as DiscordClient, User } from "discord.js";


const chance = new Chance();

function createTestEnvironment() {
    const serverManager = mock<ServerManager>();
    const serverRepository = mock<ServerRepository>();
    const serverActivityRepository = mock<ServerActivityRepository>();
    const serverCommander = mock<ServerCommander>();
    const eventLogger = mock<EventLogger>();
    const configManager = mock<ConfigManager>();
    const discordBot = mock<DiscordClient>({
        users: mock()
    });

    const sut = new TerminateEmptyServers({
        serverManager,
        serverRepository,
        serverActivityRepository,
        serverCommander,
        eventLogger,
        configManager,
        discordBot
    });

    return {
        sut,
        mocks: {
            serverManager,
            serverRepository,
            serverActivityRepository,
            serverCommander,
            eventLogger,
            configManager,
            discordBot
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

        const emptyServerToBeTerminated = createServer();
        const serverWithActivity = createServer();
        const emptyServerStillWaiting = createServer();
        const serverWithError = createServer();
        const noLongerEmptyServer = createServer();

        const user = mock<User>();
        when(mocks.discordBot.users.fetch)
        .calledWith(emptyServerToBeTerminated.createdBy!)
        .thenResolve(user)

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
            when(mocks.serverActivityRepository.getAll).calledWith().thenResolve(serverActivities);
            when(mocks.serverRepository.getAllServers).calledWith("ready").thenResolve(currentServers);

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
            expect(mocks.serverManager.deleteServer).toHaveBeenCalledWith({
                region: emptyServerToBeTerminated.region,
                serverId: emptyServerToBeTerminated.serverId
            });
        });

        it("should not terminate any of the other servers", async () => {
            const notTerminated = [
                serverWithActivity,
                emptyServerStillWaiting,
                serverWithError,
                noLongerEmptyServer
            ];
            for (const server of notTerminated) {
                expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith({
                    region: server.region,
                    serverId: server.serverId
                });
            }
        });

        it("should delete the terminated server from the repository", async () => {
            expect(mocks.serverRepository.deleteServer).toHaveBeenCalledWith(emptyServerToBeTerminated.serverId);
        });

        it("should keep the server with activity as emptySince = null", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithActivity.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            });
        });

        it("should set emptySince to now for a server that is just now empty", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: emptyServerStillWaiting.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            });
        });

        it("should set emptySince for a server that is not responding", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithError.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            });
        });

        it("should set emptySince to null for a server that is no longer empty", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: noLongerEmptyServer.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            });
        });

        it("should message the user about the termination", async () => {
            expect(user.send).toHaveBeenCalledWith(
                `Your server ${emptyServerToBeTerminated.serverId} has been terminated due to inactivity for 10 minutes.`
            );
        })
    });
});
