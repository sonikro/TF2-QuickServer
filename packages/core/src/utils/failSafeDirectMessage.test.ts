import { Client as DiscordClient, User, UserManager } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { logger } from "@tf2qs/telemetry";
import { failSafeDirectMessage } from "./failSafeDirectMessage";

vi.mock("@tf2qs/telemetry", async () => {
    const actual = await vi.importActual("@tf2qs/telemetry");
    return {
        ...actual,
        logger: {
            emit: vi.fn(),
        },
    };
});

describe("failSafeDirectMessage", () => {
    let discordBot: ReturnType<typeof mock<DiscordClient>>;
    let users: ReturnType<typeof mock<UserManager>>;
    let user: ReturnType<typeof mock<User>>;

    beforeEach(() => {
        users = mock<UserManager>();
        discordBot = mock<DiscordClient>({ users });
        user = mock<User>();
        users.fetch.mockResolvedValue(user);
        user.send.mockResolvedValue(undefined as any);
        vi.mocked(logger.emit).mockClear();
    });

    it("should fetch the user and send the message on success", async () => {
        // When
        await failSafeDirectMessage(discordBot, "user-1", "hello");

        // Then
        expect(discordBot.users.fetch).toHaveBeenCalledWith("user-1");
        expect(user.send).toHaveBeenCalledWith("hello");
        expect(logger.emit).not.toHaveBeenCalled();
    });

    it("should log and resolve when fetching the user fails", async () => {
        // Given
        users.fetch.mockRejectedValue(new Error("Cannot send messages to this user"));

        // When
        await expect(failSafeDirectMessage(discordBot, "user-1", "hello")).resolves.toBeUndefined();

        // Then
        expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({ severityText: "WARN", body: "Failed to send direct message" }));
        expect(user.send).not.toHaveBeenCalled();
    });

    it("should log and resolve when sending the message fails", async () => {
        // Given
        user.send.mockRejectedValue(new Error("send failed"));

        // When
        await expect(failSafeDirectMessage(discordBot, "user-1", "hello")).resolves.toBeUndefined();

        // Then
        expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({ severityText: "WARN", body: "Failed to send direct message" }));
    });
});
