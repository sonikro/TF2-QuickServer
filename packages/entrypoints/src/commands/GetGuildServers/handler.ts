import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetGuildServers, getRegionDisplayName } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

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

            // Build an ASCII table with the required fields
            const header = `\`\`\`\n${'ServerID'.padEnd(10)} ${'Public IP'.padEnd(16)} ${'Port'.padEnd(7)} ${'TV IP'.padEnd(16)} ${'TV Port'.padEnd(9)} ${'SV Pass'.padEnd(10)} ${'TV Pass'.padEnd(10)} ${'RCON Pass'.padEnd(16)} ${'Variant'.padEnd(22)} ${'Region'}\n${'─'.repeat(10)} ${'─'.repeat(16)} ${'─'.repeat(7)} ${'─'.repeat(16)} ${'─'.repeat(9)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(16)} ${'─'.repeat(22)} ${'─'.repeat(10)}\n`;

            const rows = servers.map(server => {
                const serverIdShort = server.serverId.substring(0, 5);
                const regionName = getRegionDisplayName(server.region);
                return `${serverIdShort.padEnd(10)} ${(server.hostIp || '').padEnd(16)} ${String(server.hostPort || '').padEnd(7)} ${(server.tvIp || '').padEnd(16)} ${String(server.tvPort || '').padEnd(9)} ${(server.hostPassword || 'N/A').padEnd(10)} ${(server.tvPassword || 'N/A').padEnd(10)} ${(server.rconPassword || 'N/A').padEnd(16)} ${server.variant.padEnd(22)} ${regionName}`;
            }).join('\n');

            const table = header + rows + '\n```';

            const content = `🖥️ **Active Servers for this Guild (${servers.length}):**\n\n${table}\n` +
                `⚠️ *Keep these credentials secure. This message is only visible to you.*`;

            if (content.length > 2000) {
                await interaction.reply({
                    content: `⚠️ You have too many active servers (${servers.length}) to display all details at once.`,
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
