import { SlashCommandBuilder } from "discord.js";

export const setUserDataDefinition = new SlashCommandBuilder()
    .setName('set-user-data')
    .setDescription('Sets user specific data')
    .addStringOption(option =>
        option.setName('steam_id_text')
            .setDescription('Steam ID in format STEAM_0:1:12345678')
            .setRequired(true)
    )
