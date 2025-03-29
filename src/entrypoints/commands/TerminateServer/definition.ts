import { SlashCommandBuilder } from "discord.js";

export const terminateServerCommandDefinition = new SlashCommandBuilder()
    .setName('terminate-server')
    .setDescription('Shuts down a specified TF2 server')
    .addStringOption(option =>
        option.setName('server_id')
            .setDescription('ID of the server to terminate')
            .setRequired(true)
    )
