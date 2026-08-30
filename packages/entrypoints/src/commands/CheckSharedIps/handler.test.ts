import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ComparePlayerSharedIps, formatDateTimeInTimeZone, SharedIp } from "@tf2qs/core";
import { checkSharedIpsCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("CheckSharedIps Command Handler", () => {
    const makeSut = (allowedUserIds: string[] = ['allowed-user-id']) => {
        const comparePlayerSharedIps = mock<ComparePlayerSharedIps>();
        const handler = checkSharedIpsCommandHandlerFactory({ comparePlayerSharedIps, allowedUserIds });
        return { handler, comparePlayerSharedIps, allowedUserIds };
    };

    const createAuthorizedInteraction = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'allowed-user-id' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;
        interaction.options = mock();
        when(interaction.options.getString)
            .calledWith('steam_id_a', true)
            .thenReturn('[U:1:29162964]');
        when(interaction.options.getString)
            .calledWith('steam_id_b', true)
            .thenReturn('[U:1:1234567]');
        return { interaction, memberPermissions };
    };

    const createSharedIp = (ipAddress: string, playerAFirstSeenAt: Date, playerBFirstSeenAt: Date): SharedIp => ({
        ipAddress,
        playerAFirstSeenAt,
        playerBFirstSeenAt,
    });

    it("should deny the command when invoked in DMs (no guildId)", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = null as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('only available within a Discord server'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.deferReply).not.toHaveBeenCalled();
        expect(comparePlayerSharedIps.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user lacks Administrator permission", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
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
        expect(comparePlayerSharedIps.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when memberPermissions is null", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.memberPermissions = null as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('Administrator'),
            flags: MessageFlags.Ephemeral
        });
        expect(comparePlayerSharedIps.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user is not in the allowlist", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut(['allowed-user-id']);
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
        expect(comparePlayerSharedIps.execute).not.toHaveBeenCalled();
    });

    it("should reply with the masked shared IP and both first-seen timestamps when players shared one IP", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        const sharedIp = createSharedIp('192.168.1.5', new Date('2026-08-01T10:00:00.000Z'), new Date('2026-08-02T11:00:00.000Z'));

        when(comparePlayerSharedIps.execute)
            .calledWith({ steamId3TextA: '[U:1:29162964]', steamId3TextB: '[U:1:1234567]' })
            .thenResolve({
                steamId3a: 'U:1:29162964',
                steamId3b: 'U:1:1234567',
                sharedIps: [sharedIp]
            });

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalledWith({
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('Players have shared 1 IP address(es):'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('192.168.1.x'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.not.stringContaining('192.168.1.5'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining(
                `first seen by U:1:29162964 at ${formatDateTimeInTimeZone(sharedIp.playerAFirstSeenAt, 'UTC')} UTC; by U:1:1234567 at ${formatDateTimeInTimeZone(sharedIp.playerBFirstSeenAt, 'UTC')} UTC`
            ),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with one line per masked shared IP when players shared several IPs", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        const sharedIps = [
            createSharedIp('192.168.1.5', new Date('2026-08-01T10:00:00.000Z'), new Date('2026-08-02T11:00:00.000Z')),
            createSharedIp('10.0.0.1', new Date('2026-08-03T12:00:00.000Z'), new Date('2026-08-04T13:00:00.000Z')),
        ];

        when(comparePlayerSharedIps.execute)
            .calledWith({ steamId3TextA: '[U:1:29162964]', steamId3TextB: '[U:1:1234567]' })
            .thenResolve({
                steamId3a: 'U:1:29162964',
                steamId3b: 'U:1:1234567',
                sharedIps
            });

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('Players have shared 2 IP address(es):'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('192.168.1.x'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('10.0.0.x'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.not.stringContaining('192.168.1.5'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.not.stringContaining('10.0.0.1'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining(
                `first seen by U:1:29162964 at ${formatDateTimeInTimeZone(sharedIps[1].playerAFirstSeenAt, 'UTC')} UTC; by U:1:1234567 at ${formatDateTimeInTimeZone(sharedIps[1].playerBFirstSeenAt, 'UTC')} UTC`
            ),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply that players never shared an IP when no shared IPs are found", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const { interaction } = createAuthorizedInteraction();

        when(comparePlayerSharedIps.execute)
            .calledWith({ steamId3TextA: '[U:1:29162964]', steamId3TextB: '[U:1:1234567]' })
            .thenResolve({
                steamId3a: 'U:1:29162964',
                steamId3b: 'U:1:1234567',
                sharedIps: []
            });

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'Players have never shared an IP address.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with the user error message when use case throws a UserError", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const { interaction } = createAuthorizedInteraction();

        when(comparePlayerSharedIps.execute)
            .calledWith({ steamId3TextA: '[U:1:29162964]', steamId3TextB: '[U:1:1234567]' })
            .thenReject(Object.assign(new Error('Invalid Steam ID format'), { name: 'UserError' }));

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'Invalid Steam ID format',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with the generic error message on unexpected error", async () => {
        // Given
        const { handler, comparePlayerSharedIps } = makeSut();
        const { interaction } = createAuthorizedInteraction();

        when(comparePlayerSharedIps.execute)
            .calledWith({ steamId3TextA: '[U:1:29162964]', steamId3TextB: '[U:1:1234567]' })
            .thenReject(new Error('boom'));

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('unexpected error running the command'),
            flags: MessageFlags.Ephemeral
        });
    });
});
