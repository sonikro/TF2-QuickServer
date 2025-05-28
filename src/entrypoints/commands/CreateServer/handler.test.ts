import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Server } from "../../../core/domain/DeployedServer";
import { getRegionDisplayName, Region } from "../../../core/domain/Region";
import { Variant } from "../../../core/domain/Variant";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";
import { createServerCommandHandlerFactory } from "./handler";
import { UserError } from "../../../core/errors/UserError";

describe("createServerCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();
        const createServerForUser = mock<CreateServerForUser>();

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
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.guildId = chance.guid();

        const region = chance.pickone(Object.values(Region));
        const variantName =  "standard-competitive";

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
            creatorId: interaction.user.id,
            guildId: interaction.guildId!
        }).thenResolve(deployedServer);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(createServerForUser.execute).toHaveBeenCalledWith({
            region: interaction.options.getString('region'),
            variantName: interaction.options.getString('variant_name'),
            creatorId: interaction.user.id,
            guildId: interaction.guildId!
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `🎉 **Server Created Successfully!** 🎉\n\n` +
                `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
                `🌍 **Region:** \`${getRegionDisplayName(deployedServer.region)}\`\n` +
                `🎮 **Variant:** \`${deployedServer.variant}\`\n\n` +
                `**CONNECT Addresses:**\n` +
                `- **SDR Connect:**\n` +
                `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                `- **Direct Connect:**\n` +
                `\`\`\`\nconnect ${deployedServer.rconAddress}:27015;${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                `- **TV Connect:**\n` +
                `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
                `⚠️ **Warning:** If you are connecting from the SDR IP, use the following RCON commands in the console:\n` +
                `\`\`\`\nrcon_address ${deployedServer.rconAddress}\nrcon_password ${deployedServer.rconPassword}\n\`\`\`\n`,
            flags: MessageFlags.Ephemeral
        });
    });

    it("should handle tf2pickup variant differently", async () => {
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.guildId = chance.guid();

        const region = chance.pickone(Object.values(Region));
        const variantName = "tf2pickup";

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        const deployedServer = mock<Server>({
            serverId: chance.guid(),
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
            creatorId: interaction.user.id,
            guildId: interaction.guildId!
        }).thenResolve(deployedServer);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining(`🎉 **Server Created and Registered!** 🎉`),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with an error if the server creation fails", async () => {
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock();
        interaction.user.id = chance.guid();

        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(["standard-competitive", "casual"]);

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!
        }).thenReject(new Error("Server creation failed"));

        const act = () => handler(interaction);

        await expect(act).rejects.toThrow("Server creation failed");
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `There was an error creating the server. Please reach out to the App Administrator.`,
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with user errors", async () => {
        const { handler, interaction, createServerForUser } = createHandler();
        interaction.options = mock();
        interaction.user.id = chance.guid();

        const region = chance.pickone(Object.values(Region));
        const variantName = chance.pickone(["standard-competitive", "casual"]);

        when(interaction.options.getString)
            .calledWith('region')
            .thenReturn(region);

        when(interaction.options.getString)
            .calledWith('variant_name')
            .thenReturn(variantName);

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!
        }).thenReject(new UserError("User error occurred"));

        const act = () => handler(interaction);
        await expect(act).rejects.toThrow("User error occurred");
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: `User error occurred`,
            flags: MessageFlags.Ephemeral
        });
    });

});
