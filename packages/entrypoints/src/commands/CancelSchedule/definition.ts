import { SlashCommandBuilder } from "discord.js";

export const cancelScheduleCommandDefinition = new SlashCommandBuilder()
    .setName('cancel-schedule')
    .setDescription('Cancels your scheduled server');
