import { Chance } from "chance";
import { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server } from "../../../core/domain/DeployedServer";
import { Region } from "../../../core/domain/Region";
import { Variant } from "../../../core/domain/Variant";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";
import { createServerCommandHandlerFactory } from "./handler";
import { UserError } from "../../../core/errors/UserError";

describe("createServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock()
        const createServerForUser = mock<CreateServerForUser>()

        const handler = createServerCommandHandlerFactory({
            createServerForUser
        });

        return {
            createServerForUser,
            interaction,
            handler,
        }
    }

    it("should create a server with the specified region and variant", async () => {
        // Given
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock()
        interaction.user.send = vi.fn()
        interaction.user.id = chance.guid()
        
        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));
        
        when(interaction.options.getString)
        .calledWith('region')
        .thenReturn(region);
        
        when(interaction.options.getString)
        .calledWith('variant_name')
        .thenReturn(variantName);

        const serverId = chance.guid();

        const deployedServer = mock<Server>({
            serverId,
            region,
            variant: variantName,
            hostIp: chance.ip(),
            hostPort: chance.integer(),
            tvIp: chance.ip(),
            tvPort: chance.integer(),
            rconPassword: chance.word(),
            hostPassword: chance.word(),
            tvPassword: chance.word(),
            rconAddress: chance.ip(),
        });

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id
        }).thenResolve(deployedServer);
        
        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(createServerForUser.execute).toHaveBeenCalledWith({
            region: interaction.options.getString('region'),
            variantName: interaction.options.getString('variant_name'),
            creatorId: interaction.user.id
        })
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `Creating server in region ${region} with the variant ${variantName}. You will receive a DM with the server details.`,
        })
        expect(interaction.user.send).toHaveBeenCalledWith({
            content: `🎉 **Server Created Successfully!** 🎉\n\n` +
            `Here are your server details:\n\n` +
            `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
            `🌍 **Region:** \`${deployedServer.region}\`\n` +
            `🎮 **Variant:** \`${deployedServer.variant}\`\n` +
            `🔑 **RCON Password:** \`${deployedServer.rconPassword}\`\n` +
            `🌐 **RCON Address:** \`${deployedServer.rconAddress}\`\n\n` +
            `**Server Connect:**\n` +
            `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
            `**TV Connect:**\n` +
            `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
            `⚠️ **Warning:** The RCON Address IP and password should only be shared with people who need to run RCON commands. To use RCON commands, enter the following in the console:\n` +
            `\`\`\`\nrcon_address ${deployedServer.rconAddress}\nrcon_password ${deployedServer.rconPassword}\n\`\`\`\n`
        });

    })

    it("should reply with an error if the server creation fails", async () => {
        // Given
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock()
        interaction.user.send = vi.fn()
        interaction.user.id = chance.guid()

        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id
        }).thenReject(new Error("Server creation failed"));

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: `There was an error creating the server. Please reach out to the App Administrator.`,
        })
    })

    it("should reply with user errors", async () => {
        // Given
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock()
        interaction.user.send = vi.fn()
        interaction.user.id = chance.guid()

        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(Object.values(Variant));

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id
        }).thenReject(new UserError("User error occurred"));

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: `User error occurred`,
        })
    })

});