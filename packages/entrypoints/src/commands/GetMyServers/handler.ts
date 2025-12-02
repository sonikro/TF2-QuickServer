import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserServers } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { formatServerMessage } from "../formatServerMessage";

type GetMyServersCommandHandlerFactoryDependencies = {
    getUserServers: GetUserServers;
}

export function getMyServersCommandHandlerFactory(dependencies: GetMyServersCommandHandlerFactoryDependencies) {
    return async function getMyServersCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getUserServers } = dependencies;
        const userId = interaction.user.id;

        try {
            const servers = await getUserServers.execute({ userId });

            if (servers.length === 0) {
                await interaction.reply({
                    content: '📭 You do not have any active servers at the moment.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const serverDetails = servers.map((server, index) => {
                if (server.status === 'ready') {
                    return formatServerMessage(server, index);
                } else {
                    const regionName = server.region;
                    return `**Server ${index + 1}** (${regionName})\n` +
                        `🆔 **Server ID:** \`${server.serverId}\`\n` +
                        `🌍 **Region:** ${server.region}\n` +
                        `🎮 **Variant:** ${server.variant}\n` +
                        `📡 **Status:** ${server.status}\n` +
                        `⏳ *Server details will be available once the server is ready*\n`;
                }
            }).join('\n');

            const content = `🖥️ **Your Active Servers:**\n\n${serverDetails}\n` +
                `⚠️ *Keep these credentials secure. This message is only visible to you.*`;

            if (content.length > 2000) {
                await interaction.reply({
                    content: '⚠️ You have too many servers to display all details at once. Please terminate some servers and try again.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.reply({
                content,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    }
}
