import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server, Region } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { GetSourceTvInfo, SourceTvInfo } from "./GetSourceTvInfo";
import Chance from "chance";

const chance = new Chance();

describe("GetSourceTvInfo", () => {
    const makeSut = () => {
        const serverRepository = mock<ServerRepository>();
        const sut = new GetSourceTvInfo({ serverRepository });
        return { sut, serverRepository };
    };

    const makeServer = (overrides: Partial<Server> = {}): Server => ({
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
        status: "ready",
        ...overrides,
    });

    it("should return SourceTV info for all ready servers", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const readyServer = makeServer();
        const anotherReadyServer = makeServer();
        when(serverRepository.getAllServers)
            .calledWith()
            .thenResolve([readyServer, anotherReadyServer]);

        // When
        const result = await sut.execute();

        // Then
        const expected: SourceTvInfo[] = [
            {
                serverId: readyServer.serverId,
                hostIp: readyServer.hostIp,
                hostPort: readyServer.hostPort,
                tvIp: readyServer.tvIp,
                tvPort: readyServer.tvPort,
                tvPassword: readyServer.tvPassword,
            },
            {
                serverId: anotherReadyServer.serverId,
                hostIp: anotherReadyServer.hostIp,
                hostPort: anotherReadyServer.hostPort,
                tvIp: anotherReadyServer.tvIp,
                tvPort: anotherReadyServer.tvPort,
                tvPassword: anotherReadyServer.tvPassword,
            },
        ];
        expect(result).toEqual(expected);
        expect(serverRepository.getAllServers).toHaveBeenCalledWith();
    });

    it("should exclude servers that are not ready", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const readyServer = makeServer();
        const pendingServer = makeServer({ status: "pending" });
        const terminatingServer = makeServer({ status: "terminating" });
        when(serverRepository.getAllServers)
            .calledWith()
            .thenResolve([readyServer, pendingServer, terminatingServer]);

        // When
        const result = await sut.execute();

        // Then
        expect(result).toHaveLength(1);
        expect(result[0].serverId).toBe(readyServer.serverId);
    });

    it("should not expose rcon or host passwords", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const readyServer = makeServer();
        when(serverRepository.getAllServers)
            .calledWith()
            .thenResolve([readyServer]);

        // When
        const result = await sut.execute();

        // Then
        expect(result[0]).not.toHaveProperty("rconPassword");
        expect(result[0]).not.toHaveProperty("hostPassword");
        expect(result[0]).not.toHaveProperty("rconAddress");
    });

    it("should omit tvPassword when the server has no SourceTV password", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        const readyServer = makeServer({ tvPassword: undefined });
        when(serverRepository.getAllServers)
            .calledWith()
            .thenResolve([readyServer]);

        // When
        const result = await sut.execute();

        // Then
        expect(result[0]).toEqual({
            serverId: readyServer.serverId,
            hostIp: readyServer.hostIp,
            hostPort: readyServer.hostPort,
            tvIp: readyServer.tvIp,
            tvPort: readyServer.tvPort,
        });
    });

    it("should return an empty array when there are no ready servers", async () => {
        // Given
        const { sut, serverRepository } = makeSut();
        when(serverRepository.getAllServers)
            .calledWith()
            .thenResolve([]);

        // When
        const result = await sut.execute();

        // Then
        expect(result).toEqual([]);
    });
});