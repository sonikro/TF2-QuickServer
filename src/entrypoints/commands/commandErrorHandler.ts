import { logger } from '../../telemetry/otel';
import { ChatInputCommandInteraction, MessageComponentInteraction, MessageFlags } from "discord.js";

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
                content: error.message,
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