import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";

type RequireMoneyOwnerParams = {
    interaction: ChatInputCommandInteraction;
    allowedUserIds: string[];
    action: string;
};

export async function requireMoneyOwner(params: RequireMoneyOwnerParams): Promise<boolean> {
    const { interaction, allowedUserIds, action } = params;

    if (!interaction.guildId) {
        await interaction.reply({
            content: '❌ This command is only available within a Discord server, not in direct messages.',
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: `❌ Only users with the **Administrator** permission can ${action}.`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    if (!allowedUserIds.includes(interaction.user.id)) {
        await interaction.reply({
            content: '❌ You are not authorized to use this command.',
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    return true;
}
