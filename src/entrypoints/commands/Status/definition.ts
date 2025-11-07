import { SlashCommandBuilder } from "discord.js";

export const statusCommandDefinition = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Returns a summary of server status across all regions');
