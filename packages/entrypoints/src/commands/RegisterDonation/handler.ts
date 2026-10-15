import { ChannelType, ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";
import { GetBalance, LedgerCurrency, LedgerTransaction, RegisterDonation, toDisplayBrl } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { requireMoneyOwner } from "../requireMoneyOwner";

type RegisterDonationCommandHandlerFactoryDependencies = {
    registerDonation: RegisterDonation;
    getBalance: GetBalance;
    allowedUserIds: string[];
    moneyChannelId: string;
    discordClient: Client;
};

export function createRegisterDonationCommandHandlerFactory(dependencies: RegisterDonationCommandHandlerFactoryDependencies) {
    return async function registerDonationCommandHandler(interaction: ChatInputCommandInteraction) {
        const { registerDonation, getBalance, allowedUserIds, moneyChannelId, discordClient } = dependencies;

        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action: 'register donations' });
        if (!authorized) {
            return;
        }

        const amount = interaction.options.getNumber('amount', true);
        const currency = interaction.options.getString('currency', true) as LedgerCurrency;
        const source = interaction.options.getString('source', true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const entry = await registerDonation.execute({
                amount,
                currency,
                source,
                actorDiscordId: interaction.user.id,
            });
            const { balanceBrlCents } = await getBalance.execute();

            await interaction.followUp({
                content: `✅ Donation registered: ${formatDonationAmount({ entry })} from "${entry.source}". New balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
                flags: MessageFlags.Ephemeral
            });

            await postDonationToMoneyChannel({ discordClient, moneyChannelId, entry, balanceBrlCents, interaction });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}

type FormatDonationAmountParams = {
    entry: LedgerTransaction;
};

function formatDonationAmount(params: FormatDonationAmountParams): string {
    const { entry } = params;
    if (entry.currencyOriginal === 'BRL') {
        return `R$ ${toDisplayBrl({ balanceBrlCents: entry.amountBrlCents })}`;
    }
    return `${entry.amountOriginal.toFixed(2)} USD (~R$ ${toDisplayBrl({ balanceBrlCents: entry.amountBrlCents })})`;
}

type PostDonationParams = {
    discordClient: Client;
    moneyChannelId: string;
    entry: LedgerTransaction;
    balanceBrlCents: number;
    interaction: ChatInputCommandInteraction;
};

async function postDonationToMoneyChannel(params: PostDonationParams): Promise<void> {
    const { discordClient, moneyChannelId, entry, balanceBrlCents, interaction } = params;
    try {
        const channel = await discordClient.channels.fetch(moneyChannelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            await interaction.followUp({
                content: '⚠️ Donation recorded, but the #money channel could not be found.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        await channel.send(
            `💰 New donation: ${formatDonationAmount({ entry })} from "${entry.source}". Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`
        );
    } catch {
        await interaction.followUp({
            content: '⚠️ Donation recorded, but posting to #money failed.',
            flags: MessageFlags.Ephemeral
        });
    }
}
