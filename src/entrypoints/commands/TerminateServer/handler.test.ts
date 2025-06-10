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
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(deleteServerForUser.execute).toHaveBeenCalledWith({
            userId,
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `All servers created by you have been terminated.`,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with user error message if UserError is thrown", async () => {
        const { handler, interaction, deleteServerForUser } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        const userError = new Error("You cannot terminate this server.");
        userError.name = "UserError";
        deleteServerForUser.execute.mockRejectedValue(userError);
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.reply.mockResolvedValue({} as any);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: userError.message,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with generic error message if unknown error is thrown", async () => {
        const { handler, interaction, deleteServerForUser } = createHandler();
        const userId = chance.guid();
        interaction.user = { id: userId } as any;

        const genericError = new Error("Something went wrong");
        deleteServerForUser.execute.mockRejectedValue(genericError);
        interaction.deferReply.mockResolvedValue({} as any);
        interaction.followUp.mockResolvedValue({} as any);

        // Mock console.error to suppress output in test
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error terminating server:", genericError);
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "An error occurred while trying to terminate your servers. Please try again later.",
            flags: MessageFlags.Ephemeral,
        });

        consoleErrorSpy.mockRestore();
    });
});
