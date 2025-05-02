import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";

export function terminateServerHandlerFactory(dependencies: {
    deleteServerForUser: DeleteServerForUser
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const { deleteServerForUser } = dependencies;
        await deleteServerForUser.execute({
            userId: userId,
        })

        await interaction.reply({
            content: `All servers created by you have been terminated.`,
            flags: MessageFlags.Ephemeral
        });
    }

}