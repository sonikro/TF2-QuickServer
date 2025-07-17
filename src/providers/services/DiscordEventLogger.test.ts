import { describe, it, expect, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Client, TextChannel } from "discord.js";
import { DiscordEventLogger } from "./DiscordEventLogger";
import { ConfigManager } from "../../core/utils/ConfigManager";

describe("DiscordEventLogger", () => {
    function createTestEnvironment() {
        const mockClient = mockDeep<Client>();
        const mockTextChannel = mockDeep<TextChannel>();
        const mockConfigManager = mockDeep<ConfigManager>();

        mockConfigManager.getDiscordConfig.mockReturnValue({ logChannelId: "1234567890" });

        const discordEventLogger = new DiscordEventLogger({
            discordClient: mockClient,
            configManager: mockConfigManager,
        });

        return { mockClient, mockTextChannel, mockConfigManager, discordEventLogger };
    }

    it("should log an event to the specified text channel", async () => {
        const { mockClient, mockTextChannel, discordEventLogger } = createTestEnvironment();

        when(mockClient.channels.fetch)
            .calledWith("1234567890")
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
