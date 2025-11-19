import { SlashCommandBuilder } from "discord.js";

export const terminateServerCommandDefinition = new SlashCommandBuilder()
    .setName('terminate-servers')
    .setDescription('Shuts down all TF2 servers created by you.')
    