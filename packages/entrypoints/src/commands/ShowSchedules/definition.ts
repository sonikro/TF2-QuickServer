import { SlashCommandBuilder } from "discord.js";

export const showSchedulesCommandDefinition = new SlashCommandBuilder()
    .setName('show-schedules')
    .setDescription('Shows your scheduled server(s)');
