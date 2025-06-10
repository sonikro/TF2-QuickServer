import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";

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
            if (error.name == "UserError") {
                await interaction.followUp({
                    content: error.message,
                    flags: MessageFlags.Ephemeral
                });
            }
            else {
                console.error("Error terminating server:", error);
                await interaction.followUp({
                    content: "An error occurred while trying to terminate your servers. Please try again later.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }

    }

}