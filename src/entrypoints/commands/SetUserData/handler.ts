import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { SetUserData } from "../../../core/usecase/SetUserData";

export function setUserDataHandlerFactory(dependencies: {
    setUserData: SetUserData
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { setUserData } = dependencies;
        const steamId = interaction.options.getString('steam_id_text');

        await setUserData.execute({
            user: {
                id: interaction.user.id,
                steamIdText: steamId!
            }
        })

        await interaction.reply({
            content: `Your user data has been set successfully!`,
            flags: MessageFlags.Ephemeral
        });

    }
}
