import { ChatInputCommandInteraction } from "discord.js";

export async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
    const region = interaction.options.getString('region');
    const variantName = interaction.options.getString('variant_name');

    // Logic for deploying server
    await interaction.reply(`Server created in region ${region} with the variant ${variantName}`);
}
