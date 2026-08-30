import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { UserError } from "../errors/UserError";
import { PlayerConnectionHistoryRepository } from "../repository/PlayerConnectionHistoryRepository";
import { ComparePlayerSharedIps } from "./ComparePlayerSharedIps";

describe("ComparePlayerSharedIps", () => {
    function makeSut() {
        const playerConnectionHistoryRepository = mock<PlayerConnectionHistoryRepository>();
        const sut = new ComparePlayerSharedIps({ playerConnectionHistoryRepository });
        return { sut, playerConnectionHistoryRepository };
    }

    it("should return the intersection of the two players' distinct IPs in A's order", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:29162964').thenResolve(['ip1', 'ip2', 'ip3']);
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:123456').thenResolve(['ip2', 'ip3', 'ip4']);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result).toEqual({ steamId3a: 'U:1:29162964', steamId3b: 'U:1:123456', sharedIps: ['ip2', 'ip3'] });
    });

    it("should return an empty sharedIps list when the players share no IPs", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:29162964').thenResolve(['ip1']);
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:123456').thenResolve(['ip4']);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result.sharedIps).toEqual([]);
    });

    it("should exclude link-local 169. IPs from both players before computing the shared IPs", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:29162964').thenResolve(['169.254.249.16', '1.2.3.4']);
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:123456').thenResolve(['169.254.249.16', '1.2.3.4', '5.6.7.8']);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result.sharedIps).toEqual(['1.2.3.4']);
    });

    it("should return an empty sharedIps list when the only common IP is a link-local 169. IP", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:29162964').thenResolve(['169.254.249.16', '8.8.8.8']);
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:123456').thenResolve(['169.254.249.16', '9.9.9.9']);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result.sharedIps).toEqual([]);
    });

    it.each([
        { input: '[U:1:29162964]' },
        { input: 'U:1:29162964' },
    ])('should query the repository with the normalized bracketless SteamID3 for $input', async ({ input }) => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:29162964').thenResolve(['ip1']);
        when(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).calledWith('U:1:123456').thenResolve(['ip1']);

        // When
        await sut.execute({ steamId3TextA: input, steamId3TextB: 'U:1:123456' });

        // Then
        expect(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).toHaveBeenCalledWith('U:1:29162964');
    });

    it("should throw UserError and not query the repository when both inputs normalize to the same Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: '[U:1:29162964]' })).rejects.toThrow(UserError);
        await expect(sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: '[U:1:29162964]' })).rejects.toThrow('The two Steam IDs must be different.');
        expect(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).not.toHaveBeenCalled();
    });

    it("should throw UserError and not query the repository when an input is not a valid Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: 'garbage', steamId3TextB: 'U:1:123456' })).rejects.toThrow(UserError);
        expect(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).not.toHaveBeenCalled();
    });

    it("should throw UserError and not query the repository when an input is not a U-format Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: '[g:1:123]', steamId3TextB: 'U:1:123456' })).rejects.toThrow(UserError);
        expect(playerConnectionHistoryRepository.getDistinctIpsBySteamId3).not.toHaveBeenCalled();
    });
});
