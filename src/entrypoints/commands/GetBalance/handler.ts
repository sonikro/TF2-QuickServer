import { ChatInputCommandInteraction } from "discord.js";
import { UserCreditsRepository } from "../../../core/repository/UserCreditsRepository";

export function createGetBalanceCommandHandlerFactory(dependencies: {
    userCreditsRepository: UserCreditsRepository
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { userCreditsRepository } = dependencies;

        const credits = await userCreditsRepository.getCredits({
            userId: interaction.user.id
        })

        await interaction.reply({
            content: `💰 You have **${credits}** credits in your account!`,
        })

    }
}
