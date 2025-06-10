import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";
import { commandErrorHandler } from "../commandErrorHandler";

export function terminateServerHandlerFactory(dependencies: {
    deleteServerForUser: DeleteServerForUser
}) {
    return async function terminateServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const { deleteServerForUser } = dependencies;

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        })

        try {
            await deleteServerForUser.execute({
                userId: userId,
            })
            await interaction.followUp({
                content: `All servers created by you have been terminated.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }

    }

}