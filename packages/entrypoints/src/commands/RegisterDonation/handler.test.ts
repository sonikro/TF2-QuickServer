import { ChannelType, ChatInputCommandInteraction, Client, MessageFlags, PermissionsBitField, TextChannel } from "discord.js";import { describe, expect, it } from "vitest";
import { mock, mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetBalance, LedgerTransaction, RegisterDonation } from "@tf2qs/core";
import { createRegisterDonationCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("RegisterDonation Command Handler", () => {
    const makeSut = (allowedUserIds: string[] = ['owner-id']) => {
        const registerDonation = mock<RegisterDonation>();
        const getBalance = mock<GetBalance>();
        const discordClient = mockDeep<Client>();
        const moneyChannel = mockDeep<TextChannel>();
        moneyChannel.type = ChannelType.GuildText;
        const handler = createRegisterDonationCommandHandlerFactory({
            registerDonation,
            getBalance,
            allowedUserIds,
            moneyChannelId: 'money-channel-id',
            discordClient,
        });
        return { handler, registerDonation, getBalance, discordClient, moneyChannel };
    };

    const createAuthorizedInteraction = (overrides: { amount?: number; currency?: string; source?: string } = {}) => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'owner-id' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;
        interaction.options = mock();
        when(interaction.options.getNumber).calledWith('amount', true).thenReturn(overrides.amount ?? 130);
        when(interaction.options.getString).calledWith('currency', true).thenReturn(overrides.currency ?? 'BRL');
        when(interaction.options.getString).calledWith('source', true).thenReturn(overrides.source ?? 'Monthly support');
        return { interaction, memberPermissions };
    };

    const makeEntry = (overrides: Partial<LedgerTransaction> = {}): LedgerTransaction => ({
        id: 1,
        occurredAt: new Date('2026-10-06T12:00:00.000Z'),
        type: 'DONATION',
        amountOriginal: 130,
        currencyOriginal: 'BRL',
        amountBrlCents: 13000,
        fxRate: 1,
        fxSource: 'NONE',
        source: 'Monthly support',
        actorDiscordId: 'owner-id',
        dedupeKey: 'donation:seed',
        createdAt: new Date('2026-10-06T12:00:01.000Z'),
        ...overrides,
    });

    it("should deny the command when invoked in DMs (no guildId)", async () => {
        // Given
        const { handler, registerDonation } = makeSut();
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
        expect(registerDonation.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user lacks Administrator permission", async () => {
        // Given
        const { handler, registerDonation } = makeSut();
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
        expect(registerDonation.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when memberPermissions is null", async () => {
        // Given
        const { handler, registerDonation } = makeSut();
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
        expect(registerDonation.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user is not in the allowlist", async () => {
        // Given
        const { handler, registerDonation } = makeSut(['owner-id']);
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
        expect(registerDonation.execute).not.toHaveBeenCalled();
    });

    it("should register a BRL donation and post the new balance to #money", async () => {
        // Given
        const { handler, registerDonation, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(registerDonation.execute)
            .calledWith({ amount: 130, currency: 'BRL', source: 'Monthly support', actorDiscordId: 'owner-id' })
            .thenResolve(makeEntry());
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(moneyChannel);

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('R$ 130.00'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('R$ 185.00'),
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('R$ 185.00'));
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('Monthly support'));
    });

    it("should register a USD donation showing the converted amount", async () => {
        // Given
        const { handler, registerDonation, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction({ amount: 10, currency: 'USD', source: 'Patreon payout' });
        when(registerDonation.execute)
            .calledWith({ amount: 10, currency: 'USD', source: 'Patreon payout', actorDiscordId: 'owner-id' })
            .thenResolve(makeEntry({
                amountOriginal: 10,
                currencyOriginal: 'USD',
                amountBrlCents: 5500,
                fxRate: 5.5,
                fxSource: 'PTAX',
                source: 'Patreon payout',
            }));
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(moneyChannel);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('10.00 USD (~R$ 55.00)'),
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('10.00 USD (~R$ 55.00)'));
    });

    it("should reply with the user error message when the donation is invalid", async () => {
        // Given
        const { handler, registerDonation, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction({ amount: 0 });
        when(registerDonation.execute)
            .calledWith({ amount: 0, currency: 'BRL', source: 'Monthly support', actorDiscordId: 'owner-id' })
            .thenReject(Object.assign(new Error('Donation amount must be greater than zero.'), { name: 'UserError' }));
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(moneyChannel);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'Donation amount must be greater than zero.',
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).not.toHaveBeenCalled();
    });

    it("should confirm without posting when the money channel is missing", async () => {
        // Given
        const { handler, registerDonation, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(registerDonation.execute).calledWith(expect.anything()).thenResolve(makeEntry());
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(null);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('Donation registered'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('could not be found'),
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).not.toHaveBeenCalled();
    });

    it("should confirm without posting when the money channel is not a text channel", async () => {
        // Given
        const { handler, registerDonation, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(registerDonation.execute).calledWith(expect.anything()).thenResolve(makeEntry());
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch)
            .calledWith('money-channel-id')
            .thenResolve({ type: ChannelType.DM } as any);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('could not be found'),
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).not.toHaveBeenCalled();
    });
});
