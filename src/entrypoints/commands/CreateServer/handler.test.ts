import { describe, it, expect, vi } from "vitest";
import { createServerCommandHandlerFactory } from "./handler";
import { ChatInputCommandInteraction } from "discord.js";
import { ServerManager } from "../../../application/services/ServerManager";
import { mock } from "vitest-mock-extended";
import { Chance } from "chance"
import { Region } from "../../../domain/Region";
import { when } from "vitest-when";
import { Variant } from "../../../domain/Variant";

describe("createServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const serverManager = mock<ServerManager>();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock()

        const handler = createServerCommandHandlerFactory({
            serverManager
        });

        return {
            serverManager,
            interaction,
            handler,
        }
    }

    it("should reply with an error if the region is not valid", async () => {
        // Given
        const { handler, interaction } = createHandler();
        interaction.options = mock()

        const invalidRegion = chance.word();

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(invalidRegion);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `Invalid region: ${invalidRegion}`,
        })
    })

    it("should reply with an error if the variant name is not valid", async () => {
        // Given
        const { handler, interaction } = createHandler();
        interaction.options = mock()

        const validRegion = chance.pickone(Object.values(Region));

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(validRegion);

        const invalidVariantName = chance.word();

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(invalidVariantName);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `Invalid variant name: ${invalidVariantName}`,
        })
    })

    it("should create a server with the specified region and variant", async () => {
        // Given
        const { handler, interaction, serverManager } = createHandler();
        interaction.options = mock()

        
        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));
        
        when(interaction.options.getString)
        .calledWith('region')
        .thenReturn(region);
        
        when(interaction.options.getString)
        .calledWith('variant_name')
        .thenReturn(variantName);

        const serverId = chance.guid();
        
        when(serverManager.deployServer).calledWith({
            region,
            variantName
        }).thenResolve({
            serverId,
            region,
            variant: variantName
        })
        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(serverManager.deployServer).toHaveBeenCalledWith({
            region: interaction.options.getString('region'),
            variantName: interaction.options.getString('variant_name')
        })
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Server ID: ${serverId}\nRegion: ${region}\nVariant: ${variantName} is being created. You will be notified when the server is ready.`,
        })

    })

    it("should reply with an error if the server creation fails", async () => {
        // Given
        const { handler, interaction, serverManager } = createHandler();
        interaction.options = mock()

        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        when(serverManager.deployServer).calledWith({
            region,
            variantName
        }).thenReject(new Error("Server creation failed"));

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `There was an error creating the server. Please reach out to the App Administrator.`,
        })
    })

});