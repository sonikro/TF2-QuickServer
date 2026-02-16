import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { PlayerConnectionHistoryRepository } from "@tf2qs/core";

type GetPlayerConnectionHistoryHandlerDependencies = {
    playerConnectionHistoryRepository: PlayerConnectionHistoryRepository;
};

export function getPlayerConnectionHistoryHandlerFactory(dependencies: GetPlayerConnectionHistoryHandlerDependencies) {
    return async (interaction: ChatInputCommandInteraction) => {
        const playerSteamId3 = interaction.options.getString('player_steam_id3', true);

        const history = await dependencies.playerConnectionHistoryRepository.findBySteamId3({
            steamId3: playerSteamId3,
        });

        if (history.length === 0) {
            await interaction.reply({
                content: `🔍 **Player Connection History**\n\nNo connection history found for: \`${playerSteamId3}\``,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const historyLines = history.map((entry, index) => {
            const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown';
            return `${index + 1}. **${entry.nickname}** - IP: \`${entry.ipAddress}\` - ${timestamp}`;
        });

        const content = [
            `🔍 **Player Connection History for ${playerSteamId3}**`,
            ``,
            `Found ${history.length} connection(s):`,
            ``,
            ...historyLines,
        ].join('\n');

        await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral
        });
    };
}
