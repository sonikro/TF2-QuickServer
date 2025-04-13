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

    it("should log an error if the channel is not text-based", async () => {
        const { mockClient, discordEventLogger } = createTestEnvironment();

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const mockNonTextChannel = mockDeep<TextChannel>();
        mockNonTextChannel.isTextBased.mockReturnValue(false);

        when(mockClient.channels.fetch)
            .calledWith("1234567890")
            .thenResolve(mockNonTextChannel);

        await discordEventLogger.log({
            eventMessage: "Test Event",
            actorId: "987654321",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to log event: Log channel with ID 1234567890 is not text-based or does not exist."
        );

        consoleErrorSpy.mockRestore();
    });

    it("should log an error if the channel does not exist", async () => {
        const { mockClient, discordEventLogger } = createTestEnvironment();

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        when(mockClient.channels.fetch)
            .calledWith("1234567890")
            .thenResolve(null);

        await discordEventLogger.log({
            eventMessage: "Test Event",
            actorId: "987654321",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to log event: Log channel with ID 1234567890 is not text-based or does not exist."
        );

        consoleErrorSpy.mockRestore();
    });
});
