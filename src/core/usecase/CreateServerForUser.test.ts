import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { CreateServerForUser } from './CreateServerForUser';
import { ServerRepository } from '../repository/ServerRepository';
import Chance from 'chance';
import { Region, Server, Variant } from '../domain';
import { ServerManager } from '../services/ServerManager';
import { when } from 'vitest-when';

const chance = new Chance();

describe('CreateServerForUser Use Case', () => {
    let createServerForUser: CreateServerForUser;
    let mockServerRepository: ServerRepository;
    let mockServerManager: ServerManager;

    const region = chance.pickone(Object.values(Region));
    const variantName = chance.pickone(Object.values(Variant));
    const userId = chance.guid();
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
    beforeAll(async () => {
        mockServerRepository = mock<ServerRepository>();
        mockServerManager = mock<ServerManager>();

        createServerForUser = new CreateServerForUser({
            serverManager: mockServerManager,
            serverRepository: mockServerRepository,
        });

        when(mockServerManager.deployServer)
            .calledWith({
                region,
                variantName
            }).thenResolve(deployedServer)

        await createServerForUser.execute({
            creatorId: userId,
            region,
            variantName
        })
    });

    it("should call serverManager.deployServer with the correct arguments", async () => {
        expect(mockServerManager.deployServer).toHaveBeenCalledWith({
            region,
            variantName
        });
    })

    it("should call serverRepository.upsertServer with the correct arguments", async () => {
        expect(mockServerRepository.upsertServer).toHaveBeenCalledWith({
            ...deployedServer,
            createdBy: userId
        });
    })
});
