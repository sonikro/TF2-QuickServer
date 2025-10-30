import { logger } from '../../telemetry/otel';
import { ChatInputCommandInteraction, MessageComponentInteraction, MessageFlags } from "discord.js";

/**
 * Central error handler for Discord command interactions.
 * 
 * Handles different error types and presents appropriate messages to users:
 * - UserError: User-facing errors with helpful messages (e.g., validation failures)
 * - AbortError: User-initiated operation cancellations
 * - InsufficientCapacityError: AWS capacity issues with clear guidance
 * - Default: Generic errors logged for admin investigation
 * 
 * @param interaction The Discord interaction to respond to
 * @param error The error that occurred during command execution
 */
export async function commandErrorHandler(interaction: ChatInputCommandInteraction | MessageComponentInteraction, error: Error) {
    switch (error.name) {
        case 'UserError':
            await interaction.followUp({
                content: error.message,
                flags: MessageFlags.Ephemeral
            });
            break;
        case 'AbortError':
            await interaction.followUp({
                content: `Operation was aborted by the user.`,
                flags: MessageFlags.Ephemeral
            });
            break;
        case 'InsufficientCapacityError':
            await interaction.followUp({
                content: `⚠️ **Insufficient Capacity Available** ⚠️\n\n` +
                    `${error.message}\n\n` +
                    `AWS does not currently have enough capacity in this region to create your server. ` +
                    `This is a temporary issue on AWS's side.\n\n` +
                    `**What you can do:**\n` +
                    `• Try again in a few minutes\n` +
                    `• Try a different region if available\n` +
                    `• Wait for AWS to add more capacity to this zone\n\n` +
                    `We apologize for the inconvenience. This issue is beyond our control.`,
                flags: MessageFlags.Ephemeral
            });
            break;
        default:
            logger.emit({
                severityText: 'ERROR',
                body: 'Error creating server',
                attributes: {
                    from: 'commandErrorHandler',
                    error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                }
            });
            await interaction.followUp({
                content: `There was an unexpected error running the command. Please reach out to the App Administrator.`,
                flags: MessageFlags.Ephemeral
            });
            break;
    }
}