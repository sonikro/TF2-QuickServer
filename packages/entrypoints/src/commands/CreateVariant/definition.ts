import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const createVariantCommandDefinition = new SlashCommandBuilder()
    .setName('create-variant')
    .setDescription('Creates a new server variant for this guild (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName('variant_name')
            .setDescription('Unique name for the variant (no spaces)')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('display_name')
            .setDescription('Display name shown to users')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('hostname')
            .setDescription('Server hostname (use {region} for region placeholder)')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('default_cfgs')
            .setDescription('JSON object of default configs (e.g., {"5cp": "config.cfg", "koth": "koth.cfg"})')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('admins')
            .setDescription('Comma-separated list of Steam IDs (e.g., STEAM_0:1:12345,STEAM_0:0:67890)')
            .setRequired(false)
    )
    .addStringOption(option =>
        option.setName('image')
            .setDescription('Docker image to use (default: sonikro/fat-tf2-standard-competitive-i386:latest)')
            .setRequired(false)
    )
    .addIntegerOption(option =>
        option.setName('empty_minutes_terminate')
            .setDescription('Minutes before terminating an empty server (default: 10)')
            .setRequired(false)
    );
