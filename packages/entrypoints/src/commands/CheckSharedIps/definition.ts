import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const checkSharedIpsCommandDefinition = new SlashCommandBuilder()
    .setName('check-shared-ips')
    .setDescription('Check whether two players have ever shared an IP address')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('steam_id_a')
            .setDescription('First player SteamID3 in U format, e.g. U:1:29162964')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('steam_id_b')
            .setDescription('Second player SteamID3 in U format, e.g. U:1:29162964')
            .setRequired(true));
