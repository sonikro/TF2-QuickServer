import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { CreateServerForUser } from './CreateServerForUser';
import { ServerRepository } from '../repository/ServerRepository';
import Chance from 'chance';
import { Region, Server, Variant } from '../domain';
import { ServerManager } from '../services/ServerManager';
import { when } from 'vitest-when';
import { UserError } from "../errors/UserError"
import { UserCreditsRepository } from '../repository/UserCreditsRepository';
import { EventLogger } from '../services/EventLogger';
import { ConfigManager } from '../utils/ConfigManager';

const chance = new Chance();

const createTestEnvironment = () => {
    const serverRepository = mock<ServerRepository>();
    const serverManager = mock<ServerManager>();
    const userCreditsRepository = mock<UserCreditsRepository>();
    const eventLogger = mock<EventLogger>();
    const configManager = mock<ConfigManager>();
    when(configManager.getCreditsConfig).calledWith().thenReturn({
        enabled: true
    })


    const region = chance.pickone(Object.values(Region));
    const variantName = chance.pickone(Object.values(Variant));
    const userId = chance.guid();

    when(serverRepository.getAllServersByUserId)
        .calledWith(userId)
        .thenResolve([])

    when(serverRepository.upsertServer).calledWith({
        serverId: expect.any(String),
        region,
        variant: variantName,
        hostIp: expect.any(String),
        hostPort: expect.any(Number),
        tvIp: expect.any(String),
        tvPort: expect.any(Number),
        rconPassword: expect.any(String),
        hostPassword: expect.any(String),
        rconAddress: expect.any(String),
        tvPassword: expect.any(String),
        createdBy: userId
    }).thenResolve();

    const deployedServer: Server = {
        serverId: chance.guid(),
        region,
        variant: variantName,
        hostIp: chance.ip(),
        hostPort: chance.integer(),
        tvIp: chance.ip(),
        tvPort: chance.integer(),
        rconPassword: chance.word(),
        hostPassword: chance.word(),
        rconAddress: chance.ip(),
        tvPassword: chance.word(),
    }

    return {
        sut: new CreateServerForUser({
            serverManager,
            serverRepository,
            userCreditsRepository,
            eventLogger,
            configManager
        }),
        mocks: {
            serverRepository,
            serverManager,
            userCreditsRepository,
            configManager,
        },
        data: {
            region,
            variantName,
            userId,
            deployedServer
        }
    }
}
describe('CreateServerForUser Use Case', () => {

    describe("credits enabled", () => {

        describe("user has credits", () => {

            const { data, mocks, sut } = createTestEnvironment();

            beforeAll(async () => {
                when(mocks.serverManager.deployServer)
                    .calledWith({
                        region: data.region,
                        variantName: data.variantName
                    }).thenResolve(data.deployedServer)

                when(mocks.userCreditsRepository.getCredits)
                    .calledWith({ userId: data.userId })
                    .thenResolve(1);

                await sut.execute({
                    creatorId: data.userId,
                    region: data.region,
                    variantName: data.variantName
                })
            });

            it("should call serverManager.deployServer with the correct arguments", async () => {
                expect(mocks.serverManager.deployServer).toHaveBeenCalledWith({
                    region: data.region,
                    variantName: data.variantName
                });
            })

            it("should call serverRepository.upsertServer with the correct arguments", async () => {
                expect(mocks.serverRepository.upsertServer).toHaveBeenCalledWith({
                    ...data.deployedServer,
                    createdBy: data.userId
                });
            })
        })

        describe("user has no credits", () => {

            it("should throw an UserError saying the user has not enough credits", async () => {
                const { data, mocks, sut } = createTestEnvironment();

                when(mocks.userCreditsRepository.getCredits).calledWith({
                    userId: data.userId
                }).thenResolve(0)

                const act = () => sut.execute({
                    creatorId: data.userId,
                    region: data.region,
                    variantName: data.variantName
                })

                await expect(act()).rejects.toThrow(new UserError("You do not have enough credits to start a server."))
            })
        })
    })

    describe("credits disabled", () => {
        it("should create server without checking credits", async () => {
            const { data, mocks, sut } = createTestEnvironment();

            when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
                enabled: false
            })

            when(mocks.serverManager.deployServer)
                .calledWith({
                    region: data.region,
                    variantName: data.variantName
                }).thenResolve(data.deployedServer)

            await sut.execute({
                creatorId: data.userId,
                region: data.region,
                variantName: data.variantName
            })

            expect(mocks.userCreditsRepository.getCredits).not.toHaveBeenCalled()
        })
    })
    

    it("should only allow one server per user", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
            enabled: false
        })

        when(mocks.serverRepository.getAllServersByUserId)
        .calledWith(data.userId)
        .thenResolve([data.deployedServer])

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName
        })

        await expect(act()).rejects.toThrow(new UserError("You already have a server running. Please terminate it before creating a new one."))
    })
});
