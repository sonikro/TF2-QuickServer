import { logger } from '@tf2qs/telemetry';
import { MessageComponentInteraction } from "discord.js";
import { StatusUpdater } from "@tf2qs/core";

export const createInteractionStatusUpdater = (interaction: MessageComponentInteraction): StatusUpdater => {
    return async (message: string) => {
        try {
            await interaction.editReply({
                content: message,
            });
        } catch (error) {
            // Fail silently
            logger.emit({ severityText: 'ERROR', body: 'Failed to update interaction status', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
        }
    }
}