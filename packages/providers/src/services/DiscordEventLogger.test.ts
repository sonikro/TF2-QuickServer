import { describe, it, expect, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Client, TextChannel } from "discord.js";
import { DiscordEventLogger } from "./DiscordEventLogger";

describe("DiscordEventLogger", () => {
    function createTestEnvironment() {
        const mockClient = mockDeep<Client>();
        const mockTextChannel = mockDeep<TextChannel>();
        const channelId = "1234567890";

        const discordEventLogger = new DiscordEventLogger({
            discordClient: mockClient,
            channelId,
        });

        return { mockClient, mockTextChannel, channelId, discordEventLogger };
    }

    it("should log an event to the specified text channel", async () => {
        const { mockClient, mockTextChannel, channelId, discordEventLogger } = createTestEnvironment();

        when(mockClient.channels.fetch)
            .calledWith(channelId)
            .thenResolve(mockTextChannel);

        mockTextChannel.isTextBased.mockReturnValue(true);

        await discordEventLogger.log({
            eventMessage: "Test Event",
            actorId: "987654321",
        });

        expect(mockClient.channels.fetch).toHaveBeenCalledWith("1234567890");
        expect(mockTextChannel.send).toHaveBeenCalledWith(
            "**Event:** Test Event\n**Actor:** <@987654321>"
        );
    });
});
