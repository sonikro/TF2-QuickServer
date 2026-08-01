import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserSchedules } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { formatScheduledServerMessage } from "../formatScheduledServerMessage";

type ShowSchedulesCommandHandlerFactoryDependencies = {
    getUserSchedules: GetUserSchedules;
}

export function showSchedulesCommandHandlerFactory(dependencies: ShowSchedulesCommandHandlerFactoryDependencies) {
    return async function showSchedulesCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getUserSchedules } = dependencies;
        const userId = interaction.user.id;

        try {
            const schedules = await getUserSchedules.execute({ userId });

            if (schedules.length === 0) {
                await interaction.reply({
                    content: '📭 You don\'t have any scheduled servers.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const scheduleDetails = schedules.map((schedule, index) =>
                formatScheduledServerMessage(schedule, index)
            ).join('\n');

            const content = `🗓️ **Your Scheduled Servers:**\n\n${scheduleDetails}`;

            if (content.length > 2000) {
                await interaction.reply({
                    content: '⚠️ You have too many schedules to display at once. Please cancel some schedules and try again.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.reply({
                content,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    }
}
