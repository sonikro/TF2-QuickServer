import { ChatInputCommandInteraction } from "discord.js";
import { ServerManager } from "../../../core/services/ServerManager";
import { Region } from "../../../core/domain";

export function terminateServerHandlerFactory(dependencies: {
    serverManager: ServerManager
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const serverId = interaction.options.getString('server_id');
        const region = interaction.options.getString('region');

        try {
            await dependencies.serverManager.deleteServer({
                region: region as Region,
                serverId: serverId!
            })
    
            await interaction.reply(`Server has been terminated.`);
        } catch (error) {
            console.error("Error terminating server:", error);
            await interaction.reply(`Failed to terminate server. Please contact the administrator.`);
        }
    }

}