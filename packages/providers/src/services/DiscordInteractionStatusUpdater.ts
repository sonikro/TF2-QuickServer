import { logger } from '@tf2qs/telemetry/src/otel';
import { MessageComponentInteraction } from "discord.js";
import { StatusUpdater } from "@tf2qs/core/src/services/StatusUpdater";

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