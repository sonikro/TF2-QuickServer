import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getRegionDisplayName, Region, Variant } from "../../../core/domain";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";

export function createServerCommandHandlerFactory(dependencies: {
    createServerForUser: CreateServerForUser,
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createServerForUser } = dependencies;
        const region = interaction.options.getString('region') as Region;
        const variantName = interaction.options.getString('variant_name') as Variant;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        // Create server
        try {
            await interaction.followUp({
                content: `Creating server in region ${getRegionDisplayName(region)} with the variant ${variantName}. You will receive the server details shortly. This can take up to 4 minutes.`,
                flags: MessageFlags.Ephemeral
            });

            const deployedServer = await createServerForUser.execute({
                region: region,
                variantName: variantName!,
                creatorId: interaction.user.id,
                guildId: interaction.guildId!
            });

            if (variantName.includes("tf2pickup")) {
                await interaction.followUp({
                    content: `🎉 **Server Created and Registered!** 🎉\n\n` +
                        `💻 This server was created and registered to the **tf2pickup.org** instance associated with this Discord Guild.\n` +
                        `🔒 You will not receive the credentials or connect information, as using the server is managed by the **tf2pickup** instance.\n` +
                        `✅ The server is now **available to be used**!`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.followUp({
                content: `🎉 **Server Created Successfully!** 🎉\n\n` +
                    `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
                    `🌍 **Region:** \`${getRegionDisplayName(deployedServer.region)}\`\n` +
                    `🎮 **Variant:** \`${deployedServer.variant}\`\n\n` +
                    `**CONNECT Addresses:**\n` +
                    `- **SDR Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                    `- **Direct Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.rconAddress}:27015;${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                    `- **TV Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
                    `⚠️ **Warning:** If you are connecting from the SDR IP, use the following RCON commands in the console:\n` +
                    `\`\`\`\nrcon_address ${deployedServer.rconAddress}\nrcon_password ${deployedServer.rconPassword}\n\`\`\`\n`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error: Error | any) {
            console.error('Error creating server:', error);
            if (error.name === 'UserError') {
                await interaction.followUp({
                    content: error.message,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.followUp({
                    content: `There was an error creating the server. Please reach out to the App Administrator.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            throw error; // Re-throw the error to be handled by the caller if needed
        }
    }
}
