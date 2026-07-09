import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server, Region } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { GetGuildServers } from "./GetGuildServers";
import Chance from "chance";

const chance = new Chance();

describe("GetGuildServers", () => {
    const makeSut = () => {
        const serverRepository = mock<ServerRepository>();
        const sut = new GetGuildServers({ serverRepository });
        return { sut, serverRepository };
    };

    it("should return only ready servers for a given guild", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const guildId = chance.guid();
        const readyServer: Server = {
            serverId: chance.guid(),
            region: Region.SA_SAOPAULO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.word(),
            rconAddress: `${chance.ip()}:27015`,
            hostPassword: chance.word(),
            tvPassword: chance.word(),
            status: "ready",
            guildId
        };
        const pendingServer: Server = {
            serverId: chance.guid(),
            region: Region.US_CHICAGO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.word(),
            rconAddress: `${chance.ip()}:27015`,
            hostPassword: chance.word(),
            tvPassword: chance.word(),
            status: "pending",
            guildId
        };
        const terminatingServer: Server = {
            serverId: chance.guid(),
            region: Region.EU_FRANKFURT_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.word(),
            rconAddress: `${chance.ip()}:27015`,
            hostPassword: chance.word(),
            tvPassword: chance.word(),
            status: "terminating",
            guildId
        };

        when(serverRepository.getAllServersByGuildId)
            .calledWith(guildId)
            .thenResolve([readyServer, pendingServer, terminatingServer]);

        // When
        const result = await sut.execute({ guildId });

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(readyServer);
        expect(serverRepository.getAllServersByGuildId).toHaveBeenCalledWith(guildId);
    });

    it("should return an empty array when guild has no servers", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const guildId = chance.guid();

        when(serverRepository.getAllServersByGuildId)
            .calledWith(guildId)
            .thenResolve([]);

        // When
        const result = await sut.execute({ guildId });

        // Then
        expect(result).toEqual([]);
        expect(serverRepository.getAllServersByGuildId).toHaveBeenCalledWith(guildId);
    });

    it("should return an empty array when guild has no ready servers", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const guildId = chance.guid();
        const pendingServer: Server = {
            serverId: chance.guid(),
            region: Region.US_CHICAGO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.word(),
            rconAddress: `${chance.ip()}:27015`,
            hostPassword: chance.word(),
            tvPassword: chance.word(),
            status: "pending",
            guildId
        };

        when(serverRepository.getAllServersByGuildId)
            .calledWith(guildId)
            .thenResolve([pendingServer]);

        // When
        const result = await sut.execute({ guildId });

        // Then
        expect(result).toEqual([]);
    });
});
