import { Chance } from "chance";
import { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { UserCreditsRepository } from "../../../core/repository/UserCreditsRepository";
import { createGetBalanceCommandHandlerFactory } from "./handler";

describe("createServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock()
        const userCreditsRepository = mock<UserCreditsRepository>()

        const handler = createGetBalanceCommandHandlerFactory({
            userCreditsRepository
        });

        return {
            userCreditsRepository,
            interaction,
            handler,
        }
    }

    it("should return the amount of credits available to the user", async () => {
        // Given
        const { handler, interaction, userCreditsRepository } = createHandler();
        interaction.user.id = chance.guid()

        const credits = chance.integer({ min: 0, max: 1000 });

        when(userCreditsRepository.getCredits)
            .calledWith({ userId: interaction.user.id })
            .thenResolve(credits);
        
        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `💰 You have **${credits}** credits in your account!`,
        })

    })

});