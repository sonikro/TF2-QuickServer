import { ChannelType, Client, TextChannel } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { logger } from "@tf2qs/telemetry";
import { sendMoneyChannelMessage } from "./sendMoneyChannelMessage";

vi.mock("@tf2qs/telemetry", async (importActual) => {
    const actual = await importActual<typeof import("@tf2qs/telemetry")>();
    return {
        ...actual,
        logger: {
            ...actual.logger,
            emit: vi.fn(),
        },
    };
});

describe("sendMoneyChannelMessage", () => {
    const makeSut = () => {
        const discordClient = mockDeep<Client>();
        const moneyChannel = mockDeep<TextChannel>();
        moneyChannel.type = ChannelType.GuildText;
        return { discordClient, moneyChannel };
    };

    it("should deliver the message and report success", async () => {
        // Given
        const { discordClient, moneyChannel } = makeSut();
        when(discordClient.channels.fetch).calledWith("money-channel-id").thenResolve(moneyChannel);

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "money-channel-id",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(true);
        expect(moneyChannel.send).toHaveBeenCalledWith("💰 New donation");
    });

    it("should refuse an unconfigured money channel id and log a warning", async () => {
        // Given
        const { discordClient, moneyChannel } = makeSut();

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(false);
        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
        expect(moneyChannel.send).not.toHaveBeenCalled();
        expect(vi.mocked(logger.emit)).toHaveBeenCalledWith({
            severityText: "WARN",
            body: "Money Channel ID is not configured. Skipping money channel post.",
        });
    });

    it("should report a missing money channel and log an error", async () => {
        // Given
        const { discordClient, moneyChannel } = makeSut();
        when(discordClient.channels.fetch).calledWith("money-channel-id").thenResolve(null);

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "money-channel-id",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(false);
        expect(moneyChannel.send).not.toHaveBeenCalled();
        expect(vi.mocked(logger.emit)).toHaveBeenCalledWith({
            severityText: "ERROR",
            body: "Money Channel not found: money-channel-id",
        });
    });

    it("should report a non-text money channel and log an error", async () => {
        // Given
        const { discordClient, moneyChannel } = makeSut();
        when(discordClient.channels.fetch)
            .calledWith("money-channel-id")
            .thenResolve({ type: ChannelType.DM } as any);

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "money-channel-id",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(false);
        expect(moneyChannel.send).not.toHaveBeenCalled();
        expect(vi.mocked(logger.emit)).toHaveBeenCalledWith({
            severityText: "ERROR",
            body: "Money Channel is not a text channel: money-channel-id",
        });
    });

    it("should log the serialized error when fetching the money channel rejects", async () => {
        // Given
        const { discordClient } = makeSut();
        when(discordClient.channels.fetch).calledWith("money-channel-id").thenReject(new Error("fetch boom"));

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "money-channel-id",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(false);
        expect(vi.mocked(logger.emit)).toHaveBeenCalledWith(expect.objectContaining({
            severityText: "ERROR",
            body: "Money Channel post failed: money-channel-id",
            attributes: { error: expect.stringContaining("fetch boom") },
        }));
    });

    it("should log the serialized error when sending the message fails", async () => {
        // Given
        const { discordClient, moneyChannel } = makeSut();
        when(discordClient.channels.fetch).calledWith("money-channel-id").thenResolve(moneyChannel);
        moneyChannel.send.mockRejectedValue(new Error("send boom"));

        // When
        const delivered = await sendMoneyChannelMessage({
            discordClient,
            moneyChannelId: "money-channel-id",
            content: "💰 New donation",
        });

        // Then
        expect(delivered).toBe(false);
        expect(vi.mocked(logger.emit)).toHaveBeenCalledWith(expect.objectContaining({
            severityText: "ERROR",
            body: "Money Channel post failed: money-channel-id",
            attributes: { error: expect.stringContaining("send boom") },
        }));
    });
});
