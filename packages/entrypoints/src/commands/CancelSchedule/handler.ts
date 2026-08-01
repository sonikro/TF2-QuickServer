import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { CancelScheduledServer, getRegionDisplayName, getVariantConfig, formatDateTimeInTimeZone } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

export function cancelScheduleCommandHandlerFactory(dependencies: {
    cancelScheduledServer: CancelScheduledServer;
}) {
    return async function cancelScheduleCommandHandler(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const { cancelScheduledServer } = dependencies;

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        })

        try {
            const cancelled = await cancelScheduledServer.execute({ userId });
            const regionDisplayName = getRegionDisplayName(cancelled.region);
            const variantDisplayName = getVariantConfig(cancelled.variant).displayName ?? cancelled.variant;
            await interaction.followUp({
                content: `✅ **Schedule cancelled:** ${regionDisplayName} · ${variantDisplayName} · ${formatDateTimeInTimeZone(cancelled.scheduledAt, cancelled.timezone)} (${cancelled.timezone})`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    }
}
