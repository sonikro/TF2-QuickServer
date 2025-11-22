import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { BackgroundTaskQueue } from "@tf2qs/core";
import { DeleteServerForUserTaskData } from "@tf2qs/providers";
import { commandErrorHandler } from "../commandErrorHandler";

export function terminateServerHandlerFactory(dependencies: {
    backgroundTaskQueue: BackgroundTaskQueue;
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const { backgroundTaskQueue } = dependencies;

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        })

        try {
            const taskData: DeleteServerForUserTaskData = { userId };
            await backgroundTaskQueue.enqueue('delete-server-for-user', taskData, {
                onSuccess: async () => {
                    await interaction.followUp({
                        content: `Server terminated successfully.`,
                        flags: MessageFlags.Ephemeral
                    });
                },
                onError: async (error) => {
                    await interaction.followUp({
                        content: `Failed to terminate server: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }, {
                maxRetries: 10,
                initialDelayMs: 60000,
                maxDelayMs: 600000,
                backoffMultiplier: 2,
            });

            await interaction.followUp({
                content: `Server termination has been initiated.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }

    }

}