import { describe, it, expect, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { MessageFlags, ChatInputCommandInteraction, MessageComponentInteraction } from "discord.js";
import { commandErrorHandler } from "./commandErrorHandler";

describe("commandErrorHandler", () => {
    const createMockInteraction = () => {
        const interaction = mock<ChatInputCommandInteraction | MessageComponentInteraction>();
        // Use vi.fn() and cast to the correct type to satisfy type requirements
        (interaction.followUp as unknown) = vi.fn().mockResolvedValue({} as any);
        return interaction;
    };

    it("handles UserError with ephemeral message", async () => {
        const interaction = createMockInteraction();
        const error = new Error("This is a user error");
        error.name = "UserError";
        await commandErrorHandler(interaction, error);
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: error.message,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("handles AbortError with abort message", async () => {
        const interaction = createMockInteraction();
        const error = new Error("Aborted");
        error.name = "AbortError";
        await commandErrorHandler(interaction, error);
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "Operation was aborted by the user.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("handles unknown error with generic message", async () => {
        const interaction = createMockInteraction();
        const error = new Error("Something went wrong");
        await commandErrorHandler(interaction, error);
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining("There was an unexpected error running the command"),
            flags: MessageFlags.Ephemeral,
        });
    });
});
