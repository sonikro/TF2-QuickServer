import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const getGuildServersCommandDefinition = new SlashCommandBuilder()
    .setName('get-guild-servers')
    .setDescription('Retrieve all active servers for this Discord guild (IPs, passwords, etc.)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
