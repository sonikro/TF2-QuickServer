import { ChatInputCommandInteraction } from "discord.js";
import { Region, Variant } from "../../../core/domain";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";

export function createServerCommandHandlerFactory(dependencies: {
    createServerForUser: CreateServerForUser
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createServerForUser } = dependencies;
        const region = interaction.options.getString('region') as Region;
        const variantName = interaction.options.getString('variant_name') as Variant;
        const adminSteamId = interaction.options.getString('admin_steam_id');

        await interaction.deferReply();
        // Create server
        try {
            await interaction.followUp({
                content: `Creating server in region ${region} with the variant ${variantName}. You will receive a DM with the server details.`,
            })

            const deployedServer = await createServerForUser.execute({
                region: region,
                variantName: variantName!,
                creatorId: interaction.user.id,
                adminSteamId: adminSteamId!
            })

            await interaction.user.send({
                content: `🎉 **Server Created Successfully!** 🎉\n\n` +
                    `Here are your server details:\n\n` +
                    `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
                    `🌍 **Region:** \`${deployedServer.region}\`\n` +
                    `🎮 **Variant:** \`${deployedServer.variant}\`\n` +
                    `🔑 **RCON Password:** \`${deployedServer.rconPassword}\`\n` +
                    `🌐 **RCON Address:** \`${deployedServer.rconAddress}\`\n\n` +
                    `**Server Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                    `**TV Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
                    `⚠️ **Warning:** The RCON Address IP and password should only be shared with people who need to run RCON commands. To use RCON commands, enter the following in the console:\n` +
                    `\`\`\`\nrcon_address ${deployedServer.rconAddress}\nrcon_password ${deployedServer.rconPassword}\n\`\`\`\n`
            })

            // Send a message to the interaction channel
            await interaction.editReply({
                content: `Server created successfully! Check your DMs for the details.`,
            })

        } catch (error) {
            console.error('Error creating server:', error);
            if(error.name === 'UserError') {
                await interaction.editReply({
                    content: error.message
                })
            } else {
                await interaction.editReply({
                    content: `There was an error creating the server. Please reach out to the App Administrator.`,
                })
            }
        }
    }
}
