import { SlashCommandBuilder } from "discord.js";
import { getRegions, getRegionDisplayName, Variant } from "../../../core/domain";

export const createServerCommandDefinition = new SlashCommandBuilder()
    .setName('create-server')
    .setDescription('Deploys a new TF2 server in the selected region with a specific variant')
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region to deploy the server')
            .addChoices(getRegions().map(region => ({
                name: getRegionDisplayName(region),
                value: region
            })))
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('variant_name')
            .setDescription('Variant of the TF2 server (6v6, 9v9, etc.)')
            .addChoices([
                ...(Object.values(Variant).map((variant) => ({
                    name: variant,
                    value: variant
                })))
            ])
            .setRequired(true)
    )
