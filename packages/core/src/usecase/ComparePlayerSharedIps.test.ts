import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { UserError } from "../errors/UserError";
import { PlayerConnectionHistoryRepository, PlayerIpFirstSeen } from "../repository/PlayerConnectionHistoryRepository";
import { ComparePlayerSharedIps } from "./ComparePlayerSharedIps";

describe("ComparePlayerSharedIps", () => {
    function makeSut() {
        const playerConnectionHistoryRepository = mock<PlayerConnectionHistoryRepository>();
        const sut = new ComparePlayerSharedIps({ playerConnectionHistoryRepository });
        return { sut, playerConnectionHistoryRepository };
    }

    function firstSeen(ipAddress: string, isoTime: string): PlayerIpFirstSeen {
        return { ipAddress, firstSeenAt: new Date(isoTime) };
    }

    it("should return the shared IPs in A's order with each player's first-seen timestamp", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:29162964')
            .thenResolve([firstSeen('ip1', '2026-08-01T10:00:00.000Z'), firstSeen('ip2', '2026-08-02T10:00:00.000Z'), firstSeen('ip3', '2026-08-03T10:00:00.000Z')]);
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:123456')
            .thenResolve([firstSeen('ip2', '2026-08-04T10:00:00.000Z'), firstSeen('ip3', '2026-08-05T10:00:00.000Z'), firstSeen('ip4', '2026-08-06T10:00:00.000Z')]);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result).toEqual({
            steamId3a: 'U:1:29162964',
            steamId3b: 'U:1:123456',
            sharedIps: [
                { ipAddress: 'ip2', playerAFirstSeenAt: new Date('2026-08-02T10:00:00.000Z'), playerBFirstSeenAt: new Date('2026-08-04T10:00:00.000Z') },
                { ipAddress: 'ip3', playerAFirstSeenAt: new Date('2026-08-03T10:00:00.000Z'), playerBFirstSeenAt: new Date('2026-08-05T10:00:00.000Z') },
            ],
        });
    });

    it("should return an empty sharedIps list when the players share no IPs", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).calledWith('U:1:29162964').thenResolve([firstSeen('ip1', '2026-08-01T10:00:00.000Z')]);
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).calledWith('U:1:123456').thenResolve([firstSeen('ip4', '2026-08-01T10:00:00.000Z')]);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result.sharedIps).toEqual([]);
    });

    it("should exclude link-local 169. IPs from both players before computing the shared IPs", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:29162964')
            .thenResolve([firstSeen('169.254.249.16', '2026-08-01T10:00:00.000Z'), firstSeen('1.2.3.4', '2026-08-02T10:00:00.000Z')]);
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:123456')
            .thenResolve([firstSeen('169.254.249.16', '2026-08-01T11:00:00.000Z'), firstSeen('1.2.3.4', '2026-08-02T11:00:00.000Z'), firstSeen('5.6.7.8', '2026-08-03T11:00:00.000Z')]);

        // When
        const result = await sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: 'U:1:123456' });

        // Then
        expect(result.sharedIps).toEqual([
            { ipAddress: '1.2.3.4', playerAFirstSeenAt: new Date('2026-08-02T10:00:00.000Z'), playerBFirstSeenAt: new Date('2026-08-02T11:00:00.000Z') },
        ]);
    });

    it("should return an empty sharedIps list when the only common IP is a link-local 169. IP", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:29162964')
            .thenResolve([firstSeen('169.254.249.16', '2026-08-01T10:00:00.000Z'), firstSeen('8.8.8.8', '2026-08-02T10:00:00.000Z')]);
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3)
            .calledWith('U:1:123456')
            .thenResolve([firstSeen('169.254.249.16', '2026-08-01T11:00:00.000Z'), firstSeen('9.9.9.9', '2026-08-02T11:00:00.000Z')]);

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
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).calledWith('U:1:29162964').thenResolve([firstSeen('ip1', '2026-08-01T10:00:00.000Z')]);
        when(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).calledWith('U:1:123456').thenResolve([firstSeen('ip1', '2026-08-01T11:00:00.000Z')]);

        // When
        await sut.execute({ steamId3TextA: input, steamId3TextB: 'U:1:123456' });

        // Then
        expect(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).toHaveBeenCalledWith('U:1:29162964');
    });

    it("should throw UserError and not query the repository when both inputs normalize to the same Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: '[U:1:29162964]' })).rejects.toThrow(UserError);
        await expect(sut.execute({ steamId3TextA: 'U:1:29162964', steamId3TextB: '[U:1:29162964]' })).rejects.toThrow('The two Steam IDs must be different.');
        expect(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).not.toHaveBeenCalled();
    });

    it("should throw UserError and not query the repository when an input is not a valid Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: 'garbage', steamId3TextB: 'U:1:123456' })).rejects.toThrow(UserError);
        expect(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).not.toHaveBeenCalled();
    });

    it("should throw UserError and not query the repository when an input is not a U-format Steam ID", async () => {
        // Given
        const { sut, playerConnectionHistoryRepository } = makeSut();

        // When/Then
        await expect(sut.execute({ steamId3TextA: '[g:1:123]', steamId3TextB: 'U:1:123456' })).rejects.toThrow(UserError);
        expect(playerConnectionHistoryRepository.getFirstSeenIpsBySteamId3).not.toHaveBeenCalled();
    });
});
