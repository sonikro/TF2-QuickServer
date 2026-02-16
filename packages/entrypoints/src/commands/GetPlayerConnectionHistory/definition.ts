import { SlashCommandBuilder } from "discord.js";

export const getPlayerConnectionHistoryDefinition = new SlashCommandBuilder()
    .setName('get-player-connection-history')
    .setDescription('Gets the connection history for a specific player (Owner only)')
    .setDefaultMemberPermissions(0)  // Hides from everyone by default
    .addStringOption(option =>
        option.setName('player_steam_id3')
            .setDescription('Player Steam ID3 (e.g., U:1:12345678)')
            .setRequired(true)
    );
