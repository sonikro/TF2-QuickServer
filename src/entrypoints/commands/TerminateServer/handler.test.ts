import { Chance } from "chance";
import { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ServerManager } from "../../../core/services/ServerManager";
import { terminateServerHandlerFactory } from "./handler";
import { Region } from "../../../core/domain";

describe("terminateServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const serverManager = mock<ServerManager>();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();

        const handler = terminateServerHandlerFactory({
            serverManager
        });

        return {
            serverManager,
            interaction,
            handler,
        };
    };


    it("should terminate the server with the specified server ID and Region", async () => {
        // Given
        const { handler, interaction, serverManager } = createHandler();
        const serverId = chance.guid();
        const region = chance.pickone(Object.values(Region))

        when(interaction.options.getString)
            .calledWith("server_id")
            .thenReturn(serverId);

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        when(serverManager.deleteServer)
            .calledWith({ serverId, region })
            .thenResolve();

        // When
        await handler(interaction);

        // Then
        expect(serverManager.deleteServer).toHaveBeenCalledWith({
            serverId,
            region
        });
        expect(interaction.reply).toHaveBeenCalledWith(
            `Server has been terminated.`,
        );
    });

    it("should reply with an error if the server termination fails", async () => {
        // Given
        const { handler, interaction, serverManager } = createHandler();
        const serverId = chance.guid();
        const region = chance.pickone(Object.values(Region))

        when(interaction.options.getString)
            .calledWith("server_id")
            .thenReturn(serverId);

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        when(serverManager.deleteServer)
            .calledWith({ serverId, region })
            .thenReject(new Error("Termination failed"));


        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith(
            'Failed to terminate server. Please contact the administrator.'
        );
    });
});