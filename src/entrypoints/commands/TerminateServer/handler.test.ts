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
            "delete-server-for-user",
            { userId },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            }),
            {
                maxRetries: 3,
                initialDelayMs: 5000,
                maxDelayMs: 60000,
                backoffMultiplier: 2,
            }
        );
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Server termination has been initiated.`,
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

    it("should call onSuccess callback when task completes", async () => {
        // Given
        const { handler, interaction, backgroundTaskQueue } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        let onSuccessCallback: ((result: unknown) => Promise<void>) | undefined;
        backgroundTaskQueue.enqueue.mockImplementation(
            async (_, __, callbacks) => {
                onSuccessCallback = callbacks?.onSuccess;
                return "task-123";
            }
        );
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        // When
        await handler(interaction);
        if (onSuccessCallback) {
            await onSuccessCallback(undefined);
        }

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Server terminated successfully.`,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should call onError callback when task fails", async () => {
        // Given
        const { handler, interaction, backgroundTaskQueue } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        let onErrorCallback: ((error: Error) => Promise<void>) | undefined;
        backgroundTaskQueue.enqueue.mockImplementation(
            async (_, __, callbacks) => {
                onErrorCallback = callbacks?.onError;
                return "task-123";
            }
        );
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        // When
        await handler(interaction);
        if (onErrorCallback) {
            await onErrorCallback(new Error("Server termination failed"));
        }

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Failed to terminate server: Server termination failed`,
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
