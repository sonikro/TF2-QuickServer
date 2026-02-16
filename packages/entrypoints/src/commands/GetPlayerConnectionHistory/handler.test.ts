import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { PlayerConnectionHistoryRepository } from "@tf2qs/core";
import { getPlayerConnectionHistoryHandlerFactory } from "./handler";

describe("getPlayerConnectionHistoryHandler", () => {
    function makeSut() {
        const playerConnectionHistoryRepositoryMock = mock<PlayerConnectionHistoryRepository>();
        const interactionMock = mock<ChatInputCommandInteraction>();
        interactionMock.options = mock();

        const sut = getPlayerConnectionHistoryHandlerFactory({
            playerConnectionHistoryRepository: playerConnectionHistoryRepositoryMock,
        });

        return {
            sut,
            playerConnectionHistoryRepositoryMock,
            interactionMock,
        };
    }

    it("should return a message when no connection history is found", async () => {
        // Given
        const { sut, playerConnectionHistoryRepositoryMock, interactionMock } = makeSut();
        const steamId3 = "[U:1:12345678]";
        
        when(interactionMock.options.getString)
            .calledWith('player_steam_id3', true)
            .thenReturn(steamId3);
        
        when(playerConnectionHistoryRepositoryMock.findBySteamId3)
            .calledWith({ steamId3 })
            .thenResolve([]);

        // When
        await sut(interactionMock);

        // Then
        expect(interactionMock.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("No connection history found for: `[U:1:12345678]`"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should display connection history entries", async () => {
        // Given
        const { sut, playerConnectionHistoryRepositoryMock, interactionMock } = makeSut();
        const steamId3 = "[U:1:12345678]";
        const mockHistory = [
            {
                id: 1,
                steamId3,
                ipAddress: "192.168.1.1",
                nickname: "Player1",
                timestamp: new Date("2024-01-15T10:00:00Z"),
            },
            {
                id: 2,
                steamId3,
                ipAddress: "192.168.1.2",
                nickname: "Player2",
                timestamp: new Date("2024-01-14T09:00:00Z"),
            },
        ];

        when(interactionMock.options.getString)
            .calledWith('player_steam_id3', true)
            .thenReturn(steamId3);
        
        when(playerConnectionHistoryRepositoryMock.findBySteamId3)
            .calledWith({ steamId3 })
            .thenResolve(mockHistory);

        // When
        await sut(interactionMock);

        // Then
        expect(interactionMock.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("Found 2 connection(s)"),
            flags: MessageFlags.Ephemeral,
        });

        const firstReplyArg = interactionMock.reply.mock.calls[0][0];
        const content = typeof firstReplyArg === "string"
            ? firstReplyArg
            : "content" in firstReplyArg && typeof firstReplyArg.content === "string"
                ? firstReplyArg.content
                : "";

        expect(content).toContain("Player1");
        expect(content).toContain("192.168.1.1");
        expect(content).toContain("Player2");
        expect(content).toContain("192.168.1.2");
    });
});
