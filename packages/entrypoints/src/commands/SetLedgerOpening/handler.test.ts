import { ChannelType, ChatInputCommandInteraction, Client, MessageFlags, PermissionsBitField, TextChannel } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock, mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetBalance, LedgerTransaction, SetLedgerOpening } from "@tf2qs/core";
import { createSetLedgerOpeningCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("SetLedgerOpening Command Handler", () => {
    const makeSut = (allowedUserIds: string[] = ['owner-id']) => {
        const setLedgerOpening = mock<SetLedgerOpening>();
        const getBalance = mock<GetBalance>();
        const discordClient = mockDeep<Client>();
        const moneyChannel = mockDeep<TextChannel>();
        moneyChannel.type = ChannelType.GuildText;
        const handler = createSetLedgerOpeningCommandHandlerFactory({
            setLedgerOpening,
            getBalance,
            allowedUserIds,
            moneyChannelId: 'money-channel-id',
            discordClient,
        });
        return { handler, setLedgerOpening, getBalance, discordClient, moneyChannel };
    };

    const createAuthorizedInteraction = (overrides: { amount?: number; currency?: string } = {}) => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'owner-id' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;
        interaction.options = mock();
        when(interaction.options.getNumber).calledWith('amount', true).thenReturn(overrides.amount ?? 130);
        when(interaction.options.getString).calledWith('currency', true).thenReturn(overrides.currency ?? 'BRL');
        return { interaction, memberPermissions };
    };

    const makeEntry = (overrides: Partial<LedgerTransaction> = {}): LedgerTransaction => ({
        id: 1,
        occurredAt: new Date('2026-10-06T12:00:00.000Z'),
        type: 'OPENING',
        amountOriginal: 130,
        currencyOriginal: 'BRL',
        amountBrlCents: 13000,
        fxRate: 1,
        fxSource: 'NONE',
        source: 'Opening balance from #money history',
        actorDiscordId: 'owner-id',
        dedupeKey: 'opening:ledger',
        createdAt: new Date('2026-10-06T12:00:01.000Z'),
        ...overrides,
    });

    it("should deny the command when invoked in DMs (no guildId)", async () => {
        // Given
        const { handler, setLedgerOpening } = makeSut();
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
        expect(setLedgerOpening.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user lacks Administrator permission", async () => {
        // Given
        const { handler, setLedgerOpening } = makeSut();
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
        expect(setLedgerOpening.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when memberPermissions is null", async () => {
        // Given
        const { handler, setLedgerOpening } = makeSut();
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
        expect(setLedgerOpening.execute).not.toHaveBeenCalled();
    });

    it("should deny the command when user is not in the allowlist", async () => {
        // Given
        const { handler, setLedgerOpening } = makeSut(['owner-id']);
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
        expect(setLedgerOpening.execute).not.toHaveBeenCalled();
    });

    it("should record the opening balance and post it to #money", async () => {
        // Given
        const { handler, setLedgerOpening, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(setLedgerOpening.execute)
            .calledWith({ amount: 130, currency: 'BRL', actorDiscordId: 'owner-id' })
            .thenResolve(makeEntry());
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(moneyChannel);

        // When
        await handler(interaction);

        // Then
        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('Opening balance recorded: R$ 130.00'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('New balance: R$ 185.00'),
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('Opening balance recorded: R$ 130.00'));
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('from "Opening balance from #money history"'));
        expect(moneyChannel.send).toHaveBeenCalledWith(expect.stringContaining('Current balance: R$ 185.00'));
    });

    it("should surface the ledger-not-empty rejection and post nothing to #money", async () => {
        // Given
        const { handler, setLedgerOpening, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(setLedgerOpening.execute)
            .calledWith({ amount: 130, currency: 'BRL', actorDiscordId: 'owner-id' })
            .thenReject(Object.assign(
                new Error('The ledger already holds transactions; the opening balance can only be set once.'),
                { name: 'UserError' }
            ));
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(moneyChannel);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'The ledger already holds transactions; the opening balance can only be set once.',
            flags: MessageFlags.Ephemeral
        });
        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
        expect(moneyChannel.send).not.toHaveBeenCalled();
    });

    it("should reply with the generic error message on unexpected error", async () => {
        // Given
        const { handler, setLedgerOpening } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(setLedgerOpening.execute).calledWith(expect.anything()).thenReject(new Error('boom'));

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('unexpected error running the command'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should confirm without posting when the money channel is missing", async () => {
        // Given
        const { handler, setLedgerOpening, getBalance, discordClient, moneyChannel } = makeSut();
        const { interaction } = createAuthorizedInteraction();
        when(setLedgerOpening.execute).calledWith(expect.anything()).thenResolve(makeEntry());
        getBalance.execute.mockResolvedValue({ balanceBrlCents: 18500 });
        when(discordClient.channels.fetch).calledWith('money-channel-id').thenResolve(null);

        // When
        await handler(interaction);

        // Then
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining('Opening balance recorded'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: '⚠️ Opening balance recorded, but it could not be posted to #money.',
            flags: MessageFlags.Ephemeral
        });
        expect(moneyChannel.send).not.toHaveBeenCalled();
    });
});
