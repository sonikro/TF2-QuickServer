import { SlashCommandBuilder } from "discord.js";
import { getEnabledRegions, RegionNames, Variant } from "../../../core/domain";

export const createServerCommandDefinition = new SlashCommandBuilder()
    .setName('create-server')
    .setDescription('Deploys a new TF2 server in the selected region with a specific variant')
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region to deploy the server')
            .addChoices(getEnabledRegions().map(region => ({
                name: RegionNames[region],
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
    .addStringOption(option =>
        option.setName('admin_steam_id')
            .setDescription('Steam ID of the SourceMod Admin to be added to the server. Use the format STEAM_0:1:12345678')
            .setRequired(false)
    )
