import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";
import { GetBalance, LedgerCurrency, LedgerTransaction, RegisterDonation, toDisplayBrl } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { requireMoneyOwner } from "../requireMoneyOwner";
import { sendMoneyChannelMessage } from "../../discord/sendMoneyChannelMessage";
import { formatLedgerEntryAmount } from "../formatLedgerEntryAmount";

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
                content: `✅ Donation registered: ${formatLedgerEntryAmount({ entry })} from "${entry.source}". New balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
                flags: MessageFlags.Ephemeral
            });

            await postDonationToMoneyChannel({ discordClient, moneyChannelId, entry, balanceBrlCents, interaction });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
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
    const delivered = await sendMoneyChannelMessage({
        discordClient,
        moneyChannelId,
        content: `💰 New donation: ${formatLedgerEntryAmount({ entry })} from "${entry.source}". Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
    });
    if (!delivered) {
        await interaction.followUp({
            content: '⚠️ Donation recorded, but it could not be posted to #money.',
            flags: MessageFlags.Ephemeral
        });
    }
}
