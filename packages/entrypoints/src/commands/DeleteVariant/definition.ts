import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const deleteVariantCommandDefinition = new SlashCommandBuilder()
    .setName('delete-variant')
    .setDescription('Deletes a server variant for this guild (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName('variant_name')
            .setDescription('Name of the variant to delete')
            .setRequired(true)
    );
