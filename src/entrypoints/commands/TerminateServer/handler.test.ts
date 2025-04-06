import { Chance } from "chance";
import { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region } from "../../../core/domain";
import { DeleteServerForUser } from "../../../core/usecase/DeleteServerForUser";
import { terminateServerHandlerFactory } from "./handler";

describe("terminateServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const deleteServerForUser = mock<DeleteServerForUser>();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();

        const handler = terminateServerHandlerFactory({
            deleteServerForUser
        });

        return {
            deleteServerForUser,
            interaction,
            handler,
        };
    };


    it("should terminate the server with the specified server ID and Region", async () => {
        // Given
        const { handler, interaction, deleteServerForUser } = createHandler();
        const serverId = chance.guid();
        const region = chance.pickone(Object.values(Region))

        interaction.user = mock();
        interaction.user.id = chance.guid();
        when(interaction.options.getString)
            .calledWith("server_id")
            .thenReturn(serverId);

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        when(deleteServerForUser.execute)
            .calledWith({ serverId, region, userId: interaction.user.id })
            .thenResolve();

        // When
        await handler(interaction);

        // Then
        expect(deleteServerForUser.execute).toHaveBeenCalledWith({
            serverId,
            region,
            userId: interaction.user.id,
        });
        expect(interaction.reply).toHaveBeenCalledWith(
            `Server has been terminated.`,
        );
    });

});