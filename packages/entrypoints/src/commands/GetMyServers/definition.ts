import { SlashCommandBuilder } from "discord.js";

export const getMyServersCommandDefinition = new SlashCommandBuilder()
    .setName('get-my-servers')
    .setDescription('Retrieve all your active server details (IPs, passwords, etc.)');
