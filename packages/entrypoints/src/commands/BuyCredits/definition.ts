import { SlashCommandBuilder } from "discord.js";
export const buyCreditsCommandDefinition = new SlashCommandBuilder()
    .setName('buy-credits')
    .setDescription('Buy credits required to run servers.')
    .addIntegerOption(option => 
        option.setName('credits')
            .setDescription('The number of credits to buy (minimum 60, maximum 5000)')
            .setRequired(true)
            .setMinValue(60)
            .setMaxValue(5000)
    );
