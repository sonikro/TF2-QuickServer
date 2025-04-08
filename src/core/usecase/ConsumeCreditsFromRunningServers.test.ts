import { describe, it, expect, beforeAll } from "vitest";
import { ConsumeCreditsFromRunningServers } from "./ConsumeCreditsFromRunningServers";
import { mock } from "vitest-mock-extended";
import { ServerRepository } from "../repository/ServerRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { when } from "vitest-when";
import { Chance } from "chance";
import { Region, Server, Variant } from "../domain";

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

    return {
        sut: new ConsumeCreditsFromRunningServers({
            serverRepository,
            userCreditsRepository
        }),
        mocks: {
            serverRepository,
            userCreditsRepository
        }
    }
}


describe("ConsumeCreditsFromRunningServers", () => {

    it("should consume credits from the user, based on the number of servers owned", async () => {
        // Given
        const {mocks, sut} = createTestEnvironment();

        const user1 = chance.guid();
        const user2 = chance.guid();
        const server1 = createServerOwnedByUser(user1);
        const server2 = createServerOwnedByUser(user1);
        const server3 = createServerOwnedByUser(user2);

        const servers = [server1, server2, server3];

        when(mocks.serverRepository.getAllServers).calledWith().thenResolve(servers);


        // When
        const creditsConsumed = await sut.execute()

        // Then
        expect(creditsConsumed).toEqual({
            [user1]: 2,
            [user2]: 1
        })
        expect(mocks.userCreditsRepository.subtractCredits).toHaveBeenCalledWith({
            userId: user1,
            credits: 2
        })
        expect(mocks.userCreditsRepository.subtractCredits).toHaveBeenCalledWith({
            userId: user2,
            credits: 1
        })
    })

})