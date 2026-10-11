import { ChatInputCommandInteraction, MessageFlags, PermissionsBitField } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { GetBalance } from "@tf2qs/core";
import { createBalanceCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("Balance Command Handler", () => {
    const makeSut = (allowedUserIds: string[] = ['owner-id']) => {
        const getBalance = mock<GetBalance>();
        const handler = createBalanceCommandHandlerFactory({ getBalance, allowedUserIds });
        return { handler, getBalance };
    };

    const createAuthorizedInteraction = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'owner-id' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;
        return { interaction, memberPermissions };
    };

    it("should deny the command when invoked in DMs (no guildId)", async () => {
        // Given
        const { handler, getBalance } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = null as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('only available within a Discord server'),
            flags: MessageFlags.Ephemeral
        });
        expect(getBalance.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user lacks Administrator permission", async () => {
        // Given
        const { handler, getBalance } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(false);
        interaction.memberPermissions = memberPermissions as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('Administrator'),
            flags: MessageFlags.Ephemeral
        });
        expect(getBalance.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user is not in the allowlist", async () => {
        // Given
        const { handler, getBalance } = makeSut(['owner-id']);
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'other-user' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('not authorized'),
            flags: MessageFlags.Ephemeral
        });
        expect(getBalance.execute).not.toHaveBeenCalled();
    });

    it("should reply with the current balance", async () => {
        // Given
        const { handler, getBalance } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('R$ 185.00'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with the generic error message on unexpected error", async () => {
        // Given
        const { handler, getBalance } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        getBalance.execute.mockRejectedValue(new Error('boom'));

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('unexpected error running the command'),
            flags: MessageFlags.Ephemeral
        });
    });
});
