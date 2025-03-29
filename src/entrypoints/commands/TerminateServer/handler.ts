import { ChatInputCommandInteraction } from "discord.js";

export async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
    const serverId = interaction.options.getString('server_id');

    // Logic for terminating server
    await interaction.reply(`Server with ID ${serverId} has been terminated.`);
}
