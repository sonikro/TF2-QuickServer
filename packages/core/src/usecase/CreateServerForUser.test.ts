import Chance from 'chance';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { Region, Server } from '../domain';
import { UserError } from "../errors/UserError";
import { GuildParametersRepository } from '../repository/GuildParametersRepository';
import { ServerRepository } from '../repository/ServerRepository';
import { UserCreditsRepository } from '../repository/UserCreditsRepository';
import { UserRepository } from '../repository/UserRepository';
import { EventLogger } from '../services/EventLogger';
import { ServerManager } from '../services/ServerManager';
import { ServerManagerFactory } from '@tf2qs/providers';
import { ConfigManager } from '../utils/ConfigManager';
import { CreateServerForUser } from './CreateServerForUser';
import { UserBanRepository } from '../repository/UserBanRepository';

vi.mock("uuid", () => {
    return {
        v4: () => "test-uuid"
    }
})

const chance = new Chance();

const createTestEnvironment = () => {
    const serverRepository = mock<ServerRepository>();
    const serverManager = mock<ServerManager>();
    const serverManagerFactory = mock<ServerManagerFactory>();
    const userCreditsRepository = mock<UserCreditsRepository>();
    const eventLogger = mock<EventLogger>();
    const configManager = mock<ConfigManager>();
    const userRepository = mock<UserRepository>();
    const guildParametersRepository = mock<GuildParametersRepository>();
    const userBanRepository = mock<UserBanRepository>({
        isUserBanned: vi.fn().mockResolvedValue({ isBanned: false, reason: '' })
    });

    // Configure the factory to return the mocked server manager for any Region
    serverManagerFactory.createServerManager.mockReturnValue(serverManager);

    when(configManager.getCreditsConfig).calledWith().thenReturn({
        enabled: true
    });

    const region = chance.pickone(Object.values(Region));
    const variantName = chance.pickone(["standard-competitive", "casual"]);
    const userId = chance.guid();
    const steamId = "STEAM_0:0:14581482";
    const guildId = chance.guid();

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

    const statusUpdater = vi.fn();


    return {
        sut: new CreateServerForUser({
            serverManagerFactory,
            serverRepository,
            userCreditsRepository,
            eventLogger,
            configManager,
            userRepository,
            guildParametersRepository,
            userBanRepository,
        }),
        mocks: {
            serverRepository,
            serverManager,
            serverManagerFactory,
            userCreditsRepository,
            configManager,
            eventLogger,
            userRepository,
            guildParametersRepository,
            userBanRepository,
            trx,
            statusUpdater
        },
        data: {
            region,
            variantName,
            userId,
            deployedServer,
            steamId,
            guildId
        }
    }
}

describe('CreateServerForUser Use Case', () => {

    describe("credits enabled", () => {

        describe("user has credits", () => {
            const { data, mocks, sut } = createTestEnvironment();

            beforeAll(async () => {
                when(mocks.serverManager.deployServer)
                    .calledWith(expect.objectContaining({
                        region: data.region,
                        variantName: data.variantName,
                        serverId: "test-uuid",
                        sourcemodAdminSteamId: data.steamId
                    }))
                    .thenResolve(data.deployedServer);

                when(mocks.userCreditsRepository.getCredits)
                    .calledWith({ userId: data.userId })
                    .thenResolve(1);

                when(mocks.guildParametersRepository.findById)
                    .calledWith(data.guildId)
                    .thenResolve(null); // no extra envs

                await sut.execute({
                    creatorId: data.userId,
                    region: data.region,
                    variantName: data.variantName,
                    guildId: data.guildId,
                    statusUpdater: mocks.statusUpdater
                });
            });

            it("should call serverManager.deployServer with the correct arguments", async () => {
                expect(mocks.serverManager.deployServer).toHaveBeenCalledWith(expect.objectContaining({
                    region: data.region,
                    variantName: data.variantName,
                    serverId: "test-uuid",
                    sourcemodAdminSteamId: data.steamId,
                    extraEnvs: {}
                }));
            });

            it("should call serverRepository.upsertServer with the correct arguments", async () => {
                expect(mocks.serverRepository.upsertServer).toHaveBeenCalledWith(expect.objectContaining({
                    ...data.deployedServer,
                    status: "ready",
                    createdBy: data.userId,
                }));
            });
        });

        describe("user has no credits", () => {
            it("should throw a UserError saying the user has not enough credits", async () => {
                const { data, mocks, sut } = createTestEnvironment();

                when(mocks.userCreditsRepository.getCredits)
                    .calledWith({ userId: data.userId })
                    .thenResolve(0);

                when(mocks.guildParametersRepository.findById)
                    .calledWith(data.guildId)
                    .thenResolve(null);

                const act = () => sut.execute({
                    creatorId: data.userId,
                    region: data.region,
                    variantName: data.variantName,
                    guildId: data.guildId,
                    statusUpdater: mocks.statusUpdater

                });

                await expect(act()).rejects.toThrow(new UserError("You do not have enough credits to start a server."));
            });
        });
    });

    describe("credits disabled", () => {
        it("should create server without checking credits", async () => {
            const { data, mocks, sut } = createTestEnvironment();

            when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
                enabled: false
            });

            when(mocks.serverManager.deployServer)
                .calledWith(expect.objectContaining({
                    region: data.region,
                    variantName: data.variantName,
                    serverId: "test-uuid"
                }))
                .thenResolve(data.deployedServer);

            when(mocks.guildParametersRepository.findById)
                .calledWith(data.guildId)
                .thenResolve(null);

            await sut.execute({
                creatorId: data.userId,
                region: data.region,
                variantName: data.variantName,
                guildId: data.guildId,
                statusUpdater: mocks.statusUpdater
            });

            expect(mocks.userCreditsRepository.getCredits).not.toHaveBeenCalled();
        });
    });

    it("should only allow one server per user with ready status", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
            enabled: false
        });

        when(mocks.serverRepository.getAllServersByUserId)
            .calledWith(data.userId, mocks.trx)
            .thenResolve([{ ...data.deployedServer, status: "ready" }]);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });

        await expect(act()).rejects.toThrow(new UserError("You already have a server running. Please terminate it before creating a new one."));
    });

    it("should only allow one server per user with pending status", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
            enabled: false
        });

        when(mocks.serverRepository.getAllServersByUserId)
            .calledWith(data.userId, mocks.trx)
            .thenResolve([{ ...data.deployedServer, status: "pending" }]);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });

        await expect(act()).rejects.toThrow(new UserError("You already have a server running. Please terminate it before creating a new one."));
    });

    it("should allow server creation if existing server is terminating", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.configManager.getCreditsConfig).calledWith().thenReturn({
            enabled: false
        });

        when(mocks.serverRepository.getAllServersByUserId)
            .calledWith(data.userId, mocks.trx)
            .thenResolve([{ ...data.deployedServer, status: "terminating" }]);

        when(mocks.serverManager.deployServer)
            .calledWith(expect.objectContaining({
                region: data.region,
                variantName: data.variantName,
                serverId: "test-uuid",
                sourcemodAdminSteamId: data.steamId
            }))
            .thenResolve(data.deployedServer);

        when(mocks.guildParametersRepository.findById)
            .calledWith(data.guildId)
            .thenResolve(null);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });

        await expect(act()).resolves.toBeDefined();
    });

    it("should add the server to the repository even if the serverManager fails", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.serverManager.deployServer)
            .calledWith(expect.objectContaining({
                region: data.region,
                variantName: data.variantName,
                serverId: "test-uuid",
                sourcemodAdminSteamId: data.steamId
            }))
            .thenReject(new Error("Server manager error"));

        when(mocks.userCreditsRepository.getCredits)
            .calledWith({ userId: data.userId })
            .thenResolve(1);

        when(mocks.guildParametersRepository.findById)
            .calledWith(data.guildId)
            .thenResolve(null);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });

        await expect(act()).rejects.toThrow(new Error("Server manager error"));

        expect(mocks.serverRepository.upsertServer).toHaveBeenCalledWith(expect.objectContaining({
            serverId: "test-uuid",
            region: data.region,
            variant: data.variantName,
            createdBy: data.userId,
            status: "pending"
        }), mocks.trx);
    });

    it("should pass environment variables from guildParameters to deployServer", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        const envVars = {
            TF2_CUSTOM_MAP: "cp_badlands",
            SERVER_NAME: "Test Server"
        };

        when(mocks.userCreditsRepository.getCredits)
            .calledWith({ userId: data.userId })
            .thenResolve(1);

        when(mocks.guildParametersRepository.findById)
            .calledWith(data.guildId)
            .thenResolve({
                id: data.guildId,
                environment_variables: envVars
            } as any);

        when(mocks.serverManager.deployServer)
            .calledWith(expect.objectContaining({
                region: data.region,
                variantName: data.variantName,
                serverId: "test-uuid",
                sourcemodAdminSteamId: data.steamId,
                extraEnvs: envVars
            }))
            .thenResolve(data.deployedServer);

        await sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater

        });

        expect(mocks.serverManager.deployServer).toHaveBeenCalledWith(expect.objectContaining({
            extraEnvs: envVars
        }));
    });

    it("should throw UserError if user is not found", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.userRepository.getById)
            .calledWith(data.userId)
            .thenResolve(null);

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater

        });

        await expect(act()).rejects.toThrow(new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.'));
    });

    it("should throw UserError if user is missing steamIdText", async () => {
        const { data, mocks, sut } = createTestEnvironment();

        when(mocks.userRepository.getById)
            .calledWith(data.userId)
            .thenResolve({
                id: data.userId,
                steamIdText: ""
            });

        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });

        await expect(act()).rejects.toThrow(new UserError('Before creating a server, please set your Steam ID using the `/set-user-data` command. This is required to give you admin access to the server.'));
    });

    it("should throw UserError if user is banned", async () => {
        const { data, mocks, sut } = createTestEnvironment();
        when(mocks.userBanRepository.isUserBanned)
            .calledWith("U:1:29162964", data.userId)
            .thenResolve({ isBanned: true, reason: 'Test ban reason' });
        when(mocks.userRepository.getById)
            .calledWith(data.userId)
            .thenResolve({ id: data.userId, steamIdText: data.steamId });
        const act = () => sut.execute({
            creatorId: data.userId,
            region: data.region,
            variantName: data.variantName,
            guildId: data.guildId,
            statusUpdater: mocks.statusUpdater
        });
        await expect(act()).rejects.toThrow(new UserError('You are banned and cannot create servers. Reason: Test ban reason'));
    });
});
