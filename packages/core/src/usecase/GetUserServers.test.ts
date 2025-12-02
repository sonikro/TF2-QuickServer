import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server, Region } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { GetUserServers } from "./GetUserServers";
import Chance from "chance";

const chance = new Chance();

describe("GetUserServers", () => {
    const makeSut = () => {
        const serverRepository = mock<ServerRepository>();
        const sut = new GetUserServers({ serverRepository });
        return { sut, serverRepository };
    };

    it("should return all servers for a given user", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const userId = chance.guid();
        const servers: Server[] = [
            {
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
                createdBy: userId
            },
            {
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
                createdBy: userId
            }
        ];
        
        when(serverRepository.getAllServersByUserId)
            .calledWith(userId)
            .thenResolve(servers);

        // When
        const result = await sut.execute({ userId });

        // Then
        expect(result).toEqual(servers);
        expect(serverRepository.getAllServersByUserId).toHaveBeenCalledWith(userId);
    });

    it("should return an empty array when user has no servers", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const userId = chance.guid();
        
        when(serverRepository.getAllServersByUserId)
            .calledWith(userId)
            .thenResolve([]);

        // When
        const result = await sut.execute({ userId });

        // Then
        expect(result).toEqual([]);
        expect(serverRepository.getAllServersByUserId).toHaveBeenCalledWith(userId);
    });

});
