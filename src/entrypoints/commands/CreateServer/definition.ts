import { SlashCommandBuilder } from "discord.js";
import { getRegions, getRegionDisplayName } from "../../../core/domain";

export const createServerCommandDefinition = new SlashCommandBuilder()
    .setName('create-server')
    .setDescription('Deploys a new TF2 server in the selected region')
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region to deploy the server')
            .addChoices(getRegions().map(region => ({
                name: getRegionDisplayName(region),
                value: region
            })))
            .setRequired(true)
    );
