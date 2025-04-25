import { beforeAll, describe, expect, it } from "vitest";
import { ServerManager } from "../services/ServerManager";
import { mock } from "vitest-mock-extended";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerActivity } from "../domain/ServerActivity";
import { TerminateEmptyServers } from "./TerminateEmptyServers";
import { ServerActivityRepository } from "../repository/ServerActivityRepository";
import { Region, Server, Variant } from "../domain";
import { Chance } from "chance";
import { when } from "vitest-when"
import { ServerCommander } from "../services/ServerCommander";
import { emptyServerStatus, nonEmptyServerStatus } from "./__tests__/mockStatusStrings";
import { EventLogger } from "../services/EventLogger";

function createTestEnvironment() {
    const serverManager = mock<ServerManager>();
    const serverRepository = mock<ServerRepository>();
    const serverActivityRepository = mock<ServerActivityRepository>();
    const serverCommander = mock<ServerCommander>();
    const eventLogger = mock<EventLogger>();

    const sut = new TerminateEmptyServers({
        serverManager,
        serverRepository,
        serverActivityRepository,
        serverCommander,
        eventLogger
    })

    return {
        sut,
        mocks: {
            serverManager,
            serverRepository,
            serverActivityRepository,
            serverCommander
        }
    }
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
        variant: chance.pickone(Object.values(Variant)),
        status: "ready",
        ...server
    }
}

const chance = new Chance();

describe("TerminateEmptyServers", () => {

    describe("1 empty server for 10 minutes and 1 server with activity", () => {

        const { sut, mocks } = createTestEnvironment();

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

        ]
        const serverActivities: ServerActivity[] = [
            {
                serverId: emptyServerToBeTerminated.serverId,
                emptySince: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago,
                lastCheckedAt: new Date(),
            },
            {
                serverId: serverWithActivity.serverId,
                emptySince: null, // not empty
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
        ]

        beforeAll(async () => {

            when(mocks.serverActivityRepository.getAll).calledWith().thenResolve(serverActivities)
            when(mocks.serverRepository.getAllServers).calledWith("ready").thenResolve(currentServers)


            when(mocks.serverCommander.query).calledWith({
                command: "status",
                host: serverWithActivity.rconAddress,
                password: serverWithActivity.rconPassword,
                port: 27015,
                timeout: 5000,
            }).thenResolve(nonEmptyServerStatus)

            when(mocks.serverCommander.query).calledWith({
                command: "status",
                host: emptyServerStillWaiting.rconAddress,
                password: emptyServerStillWaiting.rconPassword,
                port: 27015,
                timeout: 5000,
            }).thenResolve(emptyServerStatus);

            when(mocks.serverCommander.query).calledWith({
                command: "status",
                host: serverWithError.rconAddress,
                password: serverWithError.rconPassword,
                port: 27015,
                timeout: 5000,
            }).thenReject(new Error("Server not responding"));

            when(mocks.serverCommander.query).calledWith({
                command: "status",
                host: noLongerEmptyServer.rconAddress,
                password: noLongerEmptyServer.rconPassword,
                port: 27015,
                timeout: 5000,
            }).thenResolve(nonEmptyServerStatus);

            await sut.execute({
                minutesEmpty: 10
            })
        })

        it("should terminate the empty server", async () => {
            expect(mocks.serverManager.deleteServer).toHaveBeenCalledWith({
                region: currentServers[0].region,
                serverId: currentServers[0].serverId
            })
        })

        it("should not terminate the server with activity", async () => {
            expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith(serverWithActivity.serverId)
            expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith(emptyServerStillWaiting.serverId)
            expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith(serverWithError.serverId)
            expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith(noLongerEmptyServer.serverId)
        })

        it("should update the server activity repository", async () => {
            expect(mocks.serverRepository.deleteServer).toHaveBeenCalledWith(emptyServerToBeTerminated.serverId)
        })

        it("should keep the server with activity as emptySince = null", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithActivity.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            })
        })

        it("should set the emptySince to now for the server that is just empty", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: emptyServerStillWaiting.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            })
        })

        it("should set the emptySince for a server that is not responding", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: serverWithError.serverId,
                emptySince: expect.any(Date),
                lastCheckedAt: expect.any(Date)
            })
        })

        it("should set the emptySince to null for a server that is not empty anymore", async () => {
            expect(mocks.serverActivityRepository.upsert).toHaveBeenCalledWith({
                serverId: noLongerEmptyServer.serverId,
                emptySince: null,
                lastCheckedAt: expect.any(Date)
            })
        })
    })

})