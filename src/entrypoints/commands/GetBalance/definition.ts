import { SlashCommandBuilder } from "discord.js";

export const getBalanceCommandDefinition = new SlashCommandBuilder()
    .setName('get-balance')
    .setDescription('Returns the amount of credits in your account')
