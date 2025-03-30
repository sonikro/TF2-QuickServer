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
        if (!isValidRegion(region!)) {
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
            await interaction.followUp({
                content: `Creating server in region ${region} with the variant ${variantName}. You will receive a DM with the server details.`,
            })
            const deployedServer = await serverManager.deployServer({
                region: region,
                variantName: variantName!
            })

            await interaction.user.send({
                content: `Server created successfully! Here are the details:\n\n` +
                    `**Server ID:** ${deployedServer.serverId}\n` +
                    `**Region:** ${deployedServer.region}\n` +
                    `**Variant:** ${deployedServer.variant}\n` +
                    `**Host IP:** ${deployedServer.hostIp}\n` +
                    `**Host Port:** ${deployedServer.hostPort}\n` +
                    `**TV IP:** ${deployedServer.tvIp}\n` +
                    `**TV Port:** ${deployedServer.tvPort}\n` +
                    `**RCON Password:** ${deployedServer.rconPassword}\n` +
                    `**Host Password:** ${deployedServer.hostPassword}\n` +
                    `**TV Password:** ${deployedServer.tvPassword}\n` +
                    `**Server Connect:** connect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n` +
                    `**TV Connect:** connect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n`
            })

            // Send a message to the interaction channel
            await interaction.editReply({
                content: `Server created successfully! Check your DMs for the details.`,
            })

        } catch (error) {
            console.error('Error creating server:', error);
            await interaction.editReply({
                content: `There was an error creating the server. Please reach out to the App Administrator.`,
            })
        }
    }
}
