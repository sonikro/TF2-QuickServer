import { SlashCommandBuilder } from "discord.js";
import { getRegions, getRegionDisplayName } from "../../../core/domain";

export const terminateServerCommandDefinition = new SlashCommandBuilder()
    .setName('terminate-server')
    .setDescription('Shuts down a specified TF2 server')
    .addStringOption(option =>
        option.setName('server_id')
            .setDescription('ID of the server to terminate')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region of the server to terminate')
            .setRequired(true)
            .setChoices(getRegions().map(region => ({
                name: getRegionDisplayName(region),
                value: region
            })))
    )
