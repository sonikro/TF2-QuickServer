import { Chance } from "chance";
import { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ServerManager } from "../../../application/services/ServerManager";
import { DeployedServer } from "../../../domain/DeployedServer";
import { Region } from "../../../domain/Region";
import { Variant } from "../../../domain/Variant";
import { createServerCommandHandlerFactory } from "./handler";

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
        interaction.user.send = vi.fn()
        
        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));
        
        when(interaction.options.getString)
        .calledWith('region')
        .thenReturn(region);
        
        when(interaction.options.getString)
        .calledWith('variant_name')
        .thenReturn(variantName);

        const serverId = chance.guid();

        const deployedServer = mock<DeployedServer>({
            serverId,
            region,
            variant: variantName,
            hostIp: chance.ip(),
            hostPort: chance.integer(),
            tvIp: chance.ip(),
            tvPort: chance.integer(),
            rconPassword: chance.word(),
            hostPassword: chance.word(),
            tvPassword: chance.word()
        });

        when(serverManager.deployServer).calledWith({
            region,
            variantName
        }).thenResolve(deployedServer);
        
        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(serverManager.deployServer).toHaveBeenCalledWith({
            region: interaction.options.getString('region'),
            variantName: interaction.options.getString('variant_name')
        })
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Creating server in region ${region} with the variant ${variantName}. You will receive a DM with the server details.`,
        })
        expect(interaction.user.send).toHaveBeenCalledWith({
            content:  `🎉 **Server Created Successfully!** 🎉\n\n` +
            `Here are your server details:\n\n` +
            `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
            `🌍 **Region:** \`${deployedServer.region}\`\n` +
            `🎮 **Variant:** \`${deployedServer.variant}\`\n` +
            `🔑 **RCON Password:** \`${deployedServer.rconPassword}\`\n\n` +
            `**Server Connect:**\n` +
            `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};password ${deployedServer.hostPassword}\n\`\`\`\n` +
            `**TV Connect:**\n` +
            `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};password ${deployedServer.tvPassword}\n\`\`\`\n`
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
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: `There was an error creating the server. Please reach out to the App Administrator.`,
        })
    })

});