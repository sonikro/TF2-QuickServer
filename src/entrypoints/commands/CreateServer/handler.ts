import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getRegionDisplayName, Region, Variant } from "../../../core/domain";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";

export function createServerCommandHandlerFactory(dependencies: {
    createServerForUser: CreateServerForUser
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createServerForUser } = dependencies;
        const region = interaction.options.getString('region') as Region;
        const variantName = interaction.options.getString('variant_name') as Variant;
        const adminSteamId = interaction.options.getString('admin_steam_id');

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
                adminSteamId: adminSteamId!
            });

            await interaction.followUp({
                content: `🎉 **Server Created Successfully!** 🎉\n\n` +
                    `Here are your server details:\n\n` +
                    `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
                    `🌍 **Region:** \`${getRegionDisplayName(deployedServer.region)}\`\n` +
                    `🎮 **Variant:** \`${deployedServer.variant}\`\n` +
                    `🔑 **RCON Password:** \`${deployedServer.rconPassword}\`\n` +
                    `🌐 **RCON Address:** \`${deployedServer.rconAddress}\`\n\n` +
                    `**Server Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                    `**TV Connect:**\n` +
                    `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
                    `⚠️ **Warning:** The RCON Address IP and password should only be shared with people who need to run RCON commands. To use RCON commands, enter the following in the console:\n` +
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
        }
    }
}
