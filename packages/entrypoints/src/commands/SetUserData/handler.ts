import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { SetUserData } from "@tf2qs/core/src/usecase/SetUserData";
import { commandErrorHandler } from "../commandErrorHandler";

export function setUserDataHandlerFactory(dependencies: {
    setUserData: SetUserData
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { setUserData } = dependencies;
        const steamId = interaction.options.getString('steam_id_text');

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            await setUserData.execute({
                user: {
                    id: interaction.user.id,
                    steamIdText: steamId!
                }
            })
            await interaction.followUp({
                content: `Your user data has been set successfully!`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }

    }
}
