import { ChatInputCommandInteraction } from "discord.js";
import { ServerManager } from "../../../application/services/ServerManager";
import { isValidRegion } from "../../../domain/Region";
import { isValidVariant } from "../../../domain/Variant";

export function createServerCommandHandlerFactory(dependencies: {
    serverManager: ServerManager
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { serverManager } = dependencies;
        const region = interaction.options.getString('region');
        const variantName = interaction.options.getString('variant_name');

        // Validate inputs
        if(!isValidRegion(region!)) {
            await interaction.reply({
                content: `Invalid region: ${region}`,
            });
            return;
        }

        if (!isValidVariant(variantName!)) {
            await interaction.reply({
                content: `Invalid variant name: ${variantName}`,
            });
            return;
        }

        await interaction.deferReply();
        // Create server
        try {
            const deployedServer = await serverManager.deployServer({
                region: region,
                variantName: variantName!
            })

            await interaction.followUp({
                content: `Server ID: ${deployedServer.serverId}\nRegion: ${deployedServer.region}\nVariant: ${deployedServer.variant} is being created. You will be notified when the server is ready.`,
            })
            
        } catch (error) {
            await interaction.followUp({
                content: `There was an error creating the server. Please reach out to the App Administrator.`,
            })
        }


        await interaction.reply(`Server created in region ${region} with the variant ${variantName}`);
    }
}
