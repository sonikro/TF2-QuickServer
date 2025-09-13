import { Chance } from "chance";
import { beforeAll, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManager } from "../services/ServerManager";
import { ServerManagerFactory } from "../../providers/services/ServerManagerFactory";
import { EventLogger } from "../services/EventLogger";
import { TerminateLongRunningServers } from "./TerminateLongRunningServers";

const chance = new Chance();
const now = Date.now();
const ms = (h: number) => h * 60 * 60 * 1000;
const createServer = (createdAtOffsetMs: number) => ({
    hostIp: chance.ip(),
    hostPort: chance.integer(),
    serverId: chance.guid(),
    region: chance.pickone(Object.values(Region)),
    variant: chance.pickone(["standard-competitive", "casual"]),
    rconPassword: chance.word(),
    rconAddress: chance.ip(),
    tvIp: chance.ip(),
    tvPort: chance.integer(),
    createdBy: chance.guid(),
    createdAt: new Date(now - createdAtOffsetMs)
});

const createTestEnvironment = () => {
    const serverRepository = mock<ServerRepository>();
    const serverManager = mock<ServerManager>();
    const serverManagerFactory = mock<ServerManagerFactory>();
    const serverCommander = mock<ServerCommander>();
    const eventLogger = mock<EventLogger>();
    
    // Configure the factory to return the mocked server manager
    when(serverManagerFactory.createServerManager).calledWith(expect.any(String)).thenReturn(serverManager);
    
    return {
        sut: new TerminateLongRunningServers({
            serverRepository,
            serverManagerFactory,
            serverCommander,
            eventLogger
        }),
        mocks: { serverRepository, serverManager, serverManagerFactory, serverCommander, eventLogger }
    };
};

describe("TerminateLongRunningServers", () => {
    it("should send a warning to servers running >9h but <10h", async () => {
        const { sut, mocks } = createTestEnvironment();
        const serverWarn = createServer(ms(9.5));
        mocks.serverRepository.getAllServers.mockResolvedValue([serverWarn]);
        await sut.execute();
        expect(mocks.serverCommander.query).toHaveBeenCalledWith({
            command: expect.stringContaining("will be automatically terminated when it reaches 10 hours"),
            host: serverWarn.rconAddress,
            port: 27015,
            password: serverWarn.rconPassword,
            timeout: 5000
        });
        expect(mocks.serverManager.deleteServer).not.toHaveBeenCalled();
    });

    it("should terminate servers running >=10h", async () => {
        const { sut, mocks } = createTestEnvironment();
        const serverTerminate = createServer(ms(10.1));
        mocks.serverRepository.getAllServers.mockResolvedValue([serverTerminate]);
        await sut.execute();
        expect(mocks.serverCommander.query).toHaveBeenCalledWith({
            command: expect.stringContaining("is now being terminated"),
            host: serverTerminate.rconAddress,
            port: 27015,
            password: serverTerminate.rconPassword,
            timeout: 5000
        });
        expect(mocks.serverManager.deleteServer).toHaveBeenCalledWith({
            serverId: serverTerminate.serverId,
            region: serverTerminate.region
        });
        expect(mocks.serverRepository.deleteServer).toHaveBeenCalledWith(serverTerminate.serverId);
        expect(mocks.eventLogger.log).toHaveBeenCalledWith({
            eventMessage: expect.stringContaining("terminated for exceeding 10 hours runtime."),
            actorId: serverTerminate.createdBy
        });
    });

    it("should do nothing for servers running <9h", async () => {
        const { sut, mocks } = createTestEnvironment();
        const server = createServer(ms(8));
        mocks.serverRepository.getAllServers.mockResolvedValue([server]);
        await sut.execute();
        expect(mocks.serverCommander.query).not.toHaveBeenCalled();
        expect(mocks.serverManager.deleteServer).not.toHaveBeenCalled();
        expect(mocks.serverRepository.deleteServer).not.toHaveBeenCalled();
    });
});
