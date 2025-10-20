import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { BackgroundTaskQueue } from "../../../core/services/BackgroundTaskQueue";
import { terminateServerHandlerFactory } from "./handler";

describe("terminateServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const backgroundTaskQueue = mock<BackgroundTaskQueue>();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();

        const handler = terminateServerHandlerFactory({
            backgroundTaskQueue,
        });

        return {
            backgroundTaskQueue,
            interaction,
            handler,
        };
    };

    it("should terminate all servers for the user", async () => {
        // Given
        const { handler, interaction, backgroundTaskQueue } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        backgroundTaskQueue.enqueue.mockResolvedValue("task-123");
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
            "delete-server",
            { userId }
        );
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Server termination in progress. Your servers will be terminated shortly.`,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with error message if enqueue fails", async () => {
        const { handler, interaction, backgroundTaskQueue } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        const error = new Error("Failed to enqueue task");
        backgroundTaskQueue.enqueue.mockRejectedValue(error);
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "There was an unexpected error running the command. Please reach out to the App Administrator.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with generic error message if unknown error is thrown", async () => {
        const { handler, interaction, backgroundTaskQueue } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        const genericError = new Error("Something went wrong");
        backgroundTaskQueue.enqueue.mockRejectedValue(genericError);
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "There was an unexpected error running the command. Please reach out to the App Administrator.",
            flags: MessageFlags.Ephemeral,
        });

    });
});
