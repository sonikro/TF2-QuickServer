import { Chance } from "chance";
import { beforeAll, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region, Variant } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { ServerCommander } from "../services/ServerCommander";
import { ServerManager } from "../services/ServerManager";
import { TerminateServersWithoutCredit } from "./TerminateServersWithoutCredit";

const chance = new Chance();
const createServerOwnedByUser = (userId: string) => {
    return {
        hostIp: chance.ip(),
        hostPort: chance.integer(),
        serverId: chance.guid(),
        region: chance.pickone(Object.values(Region)),
        variant: chance.pickone(Object.values(Variant)),
        rconPassword: chance.word(),
        rconAddress: chance.ip(),
        tvIp: chance.ip(),
        tvPort: chance.integer(),
        createdBy: userId,
    }
}
const createTestEnvironment = () => {
    const serverRepository = mock<ServerRepository>();
    const userCreditsRepository = mock<UserCreditsRepository>();
    const serverManager = mock<ServerManager>();
    const serverCommander = mock<ServerCommander>();

    return {
        sut: new TerminateServersWithoutCredit({
            serverRepository,
            userCreditsRepository,
            serverManager,
            serverCommander
        }),
        mocks: {
            serverRepository,
            userCreditsRepository,
            serverManager,
            serverCommander
        }
    }
}

describe("TerminateServersWithoutCredit", () => {

    const { mocks, sut } = createTestEnvironment();

    const userWithCredits = chance.guid();
    const userWithoutCredits = chance.guid();
    const userWithLowCredits = chance.guid();
    const serverWithCredits = createServerOwnedByUser(userWithCredits);
    const serverWithoutCredits = createServerOwnedByUser(userWithoutCredits);
    const serverWithLowCredits = createServerOwnedByUser(userWithLowCredits);
    const servers = [
        serverWithCredits,
        serverWithoutCredits,
        serverWithLowCredits
    ]

    beforeAll(async () => {
        // Given
        when(mocks.serverRepository.getAllServers).calledWith().thenResolve(servers)
        when(mocks.userCreditsRepository.getCredits).calledWith({ userId: userWithCredits }).thenResolve(30)
        when(mocks.userCreditsRepository.getCredits).calledWith({ userId: userWithoutCredits }).thenResolve(0)
        when(mocks.userCreditsRepository.getCredits).calledWith({ userId: userWithLowCredits }).thenResolve(10)
        await sut.execute()
    })

    it("should terminate servers from players that have no more credits", async () => {
        expect(mocks.serverManager.deleteServer).toHaveBeenCalledWith({
            serverId: serverWithoutCredits.serverId,
            region: serverWithoutCredits.region
        }
        )
        expect(mocks.serverRepository.deleteServer).toHaveBeenCalledWith(serverWithoutCredits.serverId)
        expect(mocks.serverCommander.query).toHaveBeenCalledWith({
            command: `say Your server is being terminated due to lack of credits.`,
            host: serverWithoutCredits.rconAddress,
            port: 27015,
            password: serverWithoutCredits.rconPassword,
            timeout: 5000
        })
    })

    it("should not terminate servers from players that have credits", async () => {
        expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith({
            serverId: serverWithCredits.serverId,
            region: serverWithCredits.region
        })
        expect(mocks.serverRepository.deleteServer).not.toHaveBeenCalledWith(serverWithCredits.serverId)
        expect(mocks.serverManager.deleteServer).not.toHaveBeenCalledWith({
            serverId: serverWithLowCredits.serverId,
            region: serverWithLowCredits.region
        })
        expect(mocks.serverRepository.deleteServer).not.toHaveBeenCalledWith(serverWithLowCredits.serverId)
    })

    it("should send a warning message to the server when the number of credits is low", async () => {
        expect(mocks.serverCommander.query).toHaveBeenCalledWith({
            host: serverWithLowCredits.rconAddress,
            port: 27015,
            password: serverWithLowCredits.rconPassword,
            command: `say You have only 10 credits left. The server will be terminated if you run out of credits.`,
            timeout: 5000
        })
    })


})