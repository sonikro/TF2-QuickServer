import { ChatInputCommandInteraction } from "discord.js";
import { ServerManager } from "../../../application/services/ServerManager";

export function terminateServerHandlerFactory(dependencies: {
    serverManager: ServerManager
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const serverId = interaction.options.getString('server_id');

        // Logic for terminating server
        await interaction.reply(`Server with ID ${serverId} has been terminated.`);
    }

}