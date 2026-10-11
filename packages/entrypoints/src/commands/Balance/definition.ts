import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const balanceCommandDefinition = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Show the current money ledger balance (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
