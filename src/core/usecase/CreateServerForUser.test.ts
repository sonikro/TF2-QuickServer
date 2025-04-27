import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
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
import { UserRepository } from '../repository/UserRepository';

vi.mock("uuid", () => {
    return {
        v4: () => "test-uuid"
    }
})
const chance = new Chance();

const createTestEnvironment = () => {
    const serverRepository = mock<ServerRepository>();
    const serverManager = mock<ServerManager>();
    const userCreditsRepository = mock<UserCreditsRepository>();
    const eventLogger = mock<EventLogger>();
    const configManager = mock<ConfigManager>();
    const userRepository = mock<UserRepository>();

    when(configManager.getCreditsConfig).calledWith().thenReturn({
        enabled: true
    })

    
    const region = chance.pickone(Object.values(Region));
    const variantName = chance.pickone(Object.values(Variant));
    const userId = chance.guid();
    const steamId = chance.string({ length: 20 });
    when(userRepository.getById)
        .calledWith(userId)
        .thenResolve({
            id: userId,
            steamIdText: steamId
        })

    const trx = {} as any;

    when(serverRepository.getAllServersByUserId)
        .calledWith(userId, trx)
        .thenResolve([])

    when(serverRepository.runInTransaction).calledWith(expect.any(Function)).thenDo(async (fn) => {
        return fn(trx);
    });

    when(serverRepository.upsertServer)
        .calledWith(expect.objectContaining({
            serverId: expect.any(String),
            region,
            variant: variantName,
            createdBy: userId
        }), expect.anything())
        .thenResolve();

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
            configManager,
            userRepository
        }),
        mocks: {
            serverRepository,
            serverManager,
            userCreditsRepository,
            configManager,
            eventLogger,
            userRepository,
            trx,
        },
        data: {
            region,
            variantName,
            userId,
            deployedServer,
            steamId
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
                        variantName: data.variantName,
                        serverId: "test-uuid",
                        sourcemodAdminSteamId: data.steamId
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
                    variantName: data.variantName,
                    serverId: "test-uuid",
                    sourcemodAdminSteamId: data.steamId
                });
            })

            it("should call serverRepository.upsertServer with the correct arguments", async () => {
                expect(mocks.serverRepository.upsertServer).toHaveBeenCalledWith({
                    ...data.deployedServer,
                    status: "ready",
                    createdBy: data.userId,
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
                    variantName: data.variantName,
                    serverId: "test-uuid",
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
        .calledWith(data.userId, mocks.trx)
        .thenResolve([data.deployedServer])

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName
        })

        await expect(act()).rejects.toThrow(new UserError("You already have a server running. Please terminate it before creating a new one."))
    })
    
    it("should add the server to the repository even if the serverManager fails", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.serverManager.deployServer)
            .calledWith({
                region: data.region,
                variantName: data.variantName,
                serverId: "test-uuid",
                sourcemodAdminSteamId: data.steamId
            }).thenReject(new Error("Server manager error"))

        when(mocks.userCreditsRepository.getCredits)
            .calledWith({ userId: data.userId })
            .thenResolve(1);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName
        })

        await expect(act()).rejects.toThrow(new Error("Server manager error"))

        expect(mocks.serverRepository.upsertServer).toHaveBeenCalledWith({
            serverId: "test-uuid",
            region: data.region,
            variant: data.variantName,
            createdBy: data.userId,
            status: "pending"
        } as Server, mocks.trx)
    })

    it("should throw UserError if user is not found", async () => {
        const { data, mocks, sut } = createTestEnvironment();
    
        // Return null from userRepository.getById
        when(mocks.userRepository.getById)
            .calledWith(data.userId)
            .thenResolve(null);
    
        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName
        });
    
        await expect(act()).rejects.toThrow(new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.'));
    });
    
    it("should throw UserError if user is missing steamIdText", async () => {
        const { data, mocks, sut } = createTestEnvironment();
    
        // Return a user object without steamIdText
        when(mocks.userRepository.getById)
            .calledWith(data.userId)
            .thenResolve({
                id: data.userId,
                steamIdText: ""
            });
    
        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName
        });
    
        await expect(act()).rejects.toThrow(new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.'));
    });
    

});
