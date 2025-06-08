import { MessageComponentInteraction } from "discord.js";
import { StatusUpdater } from "../../core/services/StatusUpdater";

export const createInteractionStatusUpdater = (interaction: MessageComponentInteraction): StatusUpdater => {
    return async (message: string) => {
        try {
            await interaction.editReply({
                content: message,
            });
        } catch (error) {
            // Fail silently
            console.error("Failed to update interaction status:", error);
        }
    }
}