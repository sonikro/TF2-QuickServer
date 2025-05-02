import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";
import { terminateServerHandlerFactory } from "./handler";

describe("terminateServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const deleteServerForUser = mock<DeleteServerForUser>();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();

        const handler = terminateServerHandlerFactory({
            deleteServerForUser,
        });

        return {
            deleteServerForUser,
            interaction,
            handler,
        };
    };

    it("should terminate all servers for the user", async () => {
        // Given
        const { handler, interaction, deleteServerForUser } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        deleteServerForUser.execute.mockResolvedValue();

        // When
        await handler(interaction);

        // Then
        expect(deleteServerForUser.execute).toHaveBeenCalledWith({
            userId,
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `All servers created by you have been terminated.`,
            flags: MessageFlags.Ephemeral,
        });
    });
});
