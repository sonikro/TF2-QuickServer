import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetGuildServers, getRegionDisplayName } from "@tf2qs/core";

type GetGuildServersCommandHandlerFactoryDependencies = {
    getGuildServers: GetGuildServers;
}

export function getGuildServersCommandHandlerFactory(dependencies: GetGuildServersCommandHandlerFactoryDependencies) {
    return async function getGuildServersCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getGuildServers } = dependencies;

        // This command is only available within a Discord server (guild)
        if (!interaction.guildId) {
            await interaction.reply({
                content: '❌ This command is only available within a Discord server, not in direct messages.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            const servers = await getGuildServers.execute({ guildId: interaction.guildId });

            if (servers.length === 0) {
                await interaction.reply({
                    content: '📭 No active servers found for this Discord guild.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Build a compact list with the required fields
            const lines = servers.map((server, index) => {
                const serverIdShort = server.serverId.substring(0, 8);
                const regionName = getRegionDisplayName(server.region);
                const publicAddr = `${server.hostIp}:${server.hostPort}`;
                const tvAddr = `${server.tvIp}:${server.tvPort}`;
                return `**${index + 1}.** \`${serverIdShort}\` | ${regionName} | ${publicAddr} | TV: ${tvAddr} | SV: ${server.hostPassword || 'N/A'} | TVP: ${server.tvPassword || 'N/A'} | RCON: ${server.rconPassword || 'N/A'}`;
            }).join('\n');

            const content = `🖥️ **Active Servers for this Guild (${servers.length}):**\n\n${lines}\n\n⚠️ *Keep these credentials secure. This message is only visible to you.*`;

            if (content.length > 2000) {
                await interaction.reply({
                    content: `⚠️ You have ${servers.length} active servers — too many to display in a single message. Please contact the bot administrator to retrieve the full list.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.reply({
                content,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            // Use direct reply since error may occur before any reply is sent,
            // and commandErrorHandler uses followUp which requires a prior reply
            const message = error.name === 'UserError'
                ? error.message
                : '❌ An unexpected error occurred. Please try again or contact the bot administrator.';
            await interaction.reply({
                content: message,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
