import { Chance } from "chance";
import { ChatInputCommandInteraction, InteractionCollector, Message, MessageComponentInteraction, MessageFlags, PermissionsBitField } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { getVariantConfigs } from "../../../core/domain";
import { Server } from "../../../core/domain/DeployedServer";
import { Region } from "../../../core/domain/Region";
import { UserError } from "../../../core/errors/UserError";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";
import { createServerCommandHandlerFactory } from "./handler";

describe("createServerCommandHandler", () => {
    const chance = new Chance();

    // Helper to get a non-Santiago region for tests
    const getTestRegion = () => {
        const nonSantiagoRegions = Object.values(Region).filter(r => r !== Region.SA_SANTIAGO_1);
        return chance.pickone(nonSantiagoRegions);
    };

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.guildId = chance.guid();
        // Mock channel to hold the collector (since 'channel' is read-only)
        Object.defineProperty(interaction, "channel", {
            value: mock<any>(),
            writable: false,
        });

        const message = mock<Message<boolean>>()
        when(interaction.fetchReply).calledWith().thenResolve(message)
        const collector = mock<InteractionCollector<any>>();
        when(message.createMessageComponentCollector).calledWith(expect.anything()).thenReturn(collector);


        const createServerForUser = mock<CreateServerForUser>();
        const handler = createServerCommandHandlerFactory({
            createServerForUser,
        });

        return {
            createServerForUser,
            interaction,
            handler,
            message,
            collector,
        };
    };

    const mockButtonInteraction = (interaction: ChatInputCommandInteraction, variantName: string) => {
        const buttonInteraction = mock<MessageComponentInteraction>();
        buttonInteraction.customId = `create-server-variant:${variantName}`;
        buttonInteraction.user = interaction.user;
        buttonInteraction.guildId = interaction.guildId;

        buttonInteraction.deferReply = vi.fn().mockResolvedValue(undefined) as any;
        buttonInteraction.followUp = vi.fn().mockResolvedValue(undefined) as any;

        return buttonInteraction;
    };

    it("should create a server with the specified region and variant via button interaction", async () => {
        const { handler, interaction, createServerForUser, message, collector } = createHandler();
        const region = getTestRegion();
        const variantName = "standard-competitive";

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

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
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        }).thenResolve(deployedServer);

        // Add editReply mock
        const buttonInteraction = mockButtonInteraction(interaction, variantName);
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        // Call the command handler
        await handler(interaction);

        // Simulate the collector's "collect" event firing
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        const collectCallback = collectCall[1];
        await collectCallback(buttonInteraction);

        // Assertions
        expect(interaction.reply).toHaveBeenCalled();
        expect(createServerForUser.execute).toHaveBeenCalledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        });
        expect(buttonInteraction.deferReply).toHaveBeenCalled();
        expect(buttonInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Creating server in region`),
        });
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining("Server Created Successfully"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should handle tf2pickup variant differently", async () => {
        const { handler, interaction, createServerForUser, message, collector } = createHandler();
        const region = getTestRegion();
        const variantName = "tf2pickup";

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        // Use the message and collector from createHandler
        // No need to mock createMessageComponentCollector or fetchReply here

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
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        }).thenResolve(deployedServer);

        const buttonInteraction = mockButtonInteraction(interaction, variantName);
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        // Simulate the collector's "collect" event firing
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        const collectCallback = collectCall[1];
        await collectCallback(buttonInteraction);

        expect(buttonInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Creating server in region`),
        });
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining("Server Created and Registered"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with an error if the server creation fails", async () => {
        const { handler, interaction, createServerForUser, message, collector } = createHandler();
        const region = getTestRegion();
        const variantName = "standard-competitive";

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        // Use the message and collector from createHandler

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        }).thenReject(new Error("Server creation failed"));

        const buttonInteraction = mockButtonInteraction(interaction, variantName);
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        // Simulate the collector's "collect" event firing
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        const collectCallback = collectCall[1];
        await collectCallback(buttonInteraction);

        expect(buttonInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Creating server in region`),
        });
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: `There was an unexpected error running the command. Please reach out to the App Administrator.`,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with user errors", async () => {
        const { handler, interaction, createServerForUser, message, collector } = createHandler();
        const region = getTestRegion();
        const variantName = "casual";

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        // Use the message and collector from createHandler

        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        }).thenReject(new UserError("User error occurred"));

        const buttonInteraction = mockButtonInteraction(interaction, variantName);
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        // Simulate the collector's "collect" event firing
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        const collectCallback = collectCall[1];
        await collectCallback(buttonInteraction);

        expect(buttonInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Creating server in region`),
        });
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: `User error occurred`,
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should only show variants with matching guildId or no guildId", async () => {
        const { handler, interaction } = createHandler();
        const region = getTestRegion();
        const guildId = interaction.guildId;

        const variants = getVariantConfigs();

        const variantsWithGuildId = variants.filter(v => v.config.guildId === guildId);
        const variantsWithoutGuildId = variants.filter(v => !v.config.guildId);
        const expectedVariants = [...variantsWithoutGuildId]
            .map(v => v.config.displayName || v.name);
        const expectedHiddenVariants = variantsWithGuildId.map(v => v.config.displayName || v.name);
        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;
        // Use the message and collector from createHandler

        // Call the command handler
        await handler(interaction);
        // Check that only the correct variants are shown
        const replyCall = (interaction.reply as any).mock.calls[0][0];
        expect(replyCall.components.flatMap((row: any) => row.components.map((btn: any) => btn.data.label))).toEqual(
            expect.arrayContaining(expectedVariants)
        );
        expect(replyCall.components.flatMap((row: any) => row.components.map((btn: any) => btn.data.label))).not.toContain(
            expectedHiddenVariants
        );
    });

    it("should reply with abort message if server creation is aborted by the user", async () => {
        const { handler, interaction, createServerForUser, message, collector } = createHandler();
        const region = getTestRegion();
        const variantName = "standard-competitive";

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(region);

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        // Use the message and collector from createHandler

        const abortError = new Error("Aborted by user");
        abortError.name = "AbortError";
        when(createServerForUser.execute).calledWith({
            region,
            variantName,
            creatorId: interaction.user.id,
            guildId: interaction.guildId!,
            statusUpdater: expect.any(Function),
        }).thenReject(abortError);

        const buttonInteraction = mockButtonInteraction(interaction, variantName);
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        // Simulate the collector's "collect" event firing
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        const collectCallback = collectCall[1];
        await collectCallback(buttonInteraction);

        expect(buttonInteraction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Creating server in region`),
        });
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: `Operation was aborted by the user.`,
            flags: MessageFlags.Ephemeral,
        });
    });



    it("it should only show 64bit variants for Santiago", async () => {
        const { handler, interaction } = createHandler();

        interaction.guildId = "1323509685264842752" // InsertCoin

        when(interaction.options.getString)
            .calledWith("region")
            .thenReturn(Region.SA_SANTIAGO_1);

        // Mock admin permissions to bypass the Santiago block

        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        const replyCall = (interaction.reply as any).mock.calls[0][0];
        const displayedVariants = replyCall.components.flatMap((row: any) => row.components.map((btn: any) => btn.data.label));
        
        expect(displayedVariants).toEqual(['Standard Competitive', 'InsertCoin Mixes']);
    });
});
