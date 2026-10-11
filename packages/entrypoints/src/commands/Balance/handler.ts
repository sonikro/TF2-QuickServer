import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { GetBalance, toDisplayBrl } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

type BalanceCommandHandlerFactoryDependencies = {
    getBalance: GetBalance;
    allowedUserIds: string[];
};

export function createBalanceCommandHandlerFactory(dependencies: BalanceCommandHandlerFactoryDependencies) {
    return async function balanceCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getBalance, allowedUserIds } = dependencies;

        if (!interaction.guildId) {
            await interaction.reply({
                content: '❌ This command is only available within a Discord server, not in direct messages.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ Only users with the **Administrator** permission can check the balance.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (!allowedUserIds.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const { balanceBrlCents } = await getBalance.execute();
            await interaction.followUp({
                content: `💰 Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}
