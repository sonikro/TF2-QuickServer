import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { BackgroundTaskQueue } from "../../../core/services/BackgroundTaskQueue";
import { DeleteServerTaskData } from "../../../providers/queue/DeleteServerTaskProcessor";
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
            const taskData: DeleteServerTaskData = { userId };
            await backgroundTaskQueue.enqueue('delete-server', taskData);

            await interaction.followUp({
                content: `Server termination has been initiated.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }

    }

}