import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Region } from "../../../core/domain";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";

export function terminateServerHandlerFactory(dependencies: {
    deleteServerForUser: DeleteServerForUser
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const serverId = interaction.options.getString('server_id');
        const region = interaction.options.getString('region');
        const userId = interaction.user.id;
        const { deleteServerForUser } = dependencies;
        await deleteServerForUser.execute({
            region: region as Region,
            serverId: serverId!,
            userId: userId,
        })

        await interaction.reply({
            content: `Server has been terminated.`,
            flags: MessageFlags.Ephemeral
        });
    }

}