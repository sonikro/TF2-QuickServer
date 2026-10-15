import { ChatInputCommandInteraction, Client, MessageFlags } from "discord.js";
import { GetBalance, LedgerCurrency, LedgerTransaction, SetLedgerOpening, toDisplayBrl } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { requireMoneyOwner } from "../requireMoneyOwner";
import { sendMoneyChannelMessage } from "../../discord/sendMoneyChannelMessage";
import { formatLedgerEntryAmount } from "../formatLedgerEntryAmount";

type SetLedgerOpeningCommandHandlerFactoryDependencies = {
    setLedgerOpening: SetLedgerOpening;
    getBalance: GetBalance;
    allowedUserIds: string[];
    moneyChannelId: string;
    discordClient: Client;
};

export function createSetLedgerOpeningCommandHandlerFactory(dependencies: SetLedgerOpeningCommandHandlerFactoryDependencies) {
    return async function setLedgerOpeningCommandHandler(interaction: ChatInputCommandInteraction) {
        const { setLedgerOpening, getBalance, allowedUserIds, moneyChannelId, discordClient } = dependencies;

        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action: 'change the opening balance' });
        if (!authorized) {
            return;
        }

        const amount = interaction.options.getNumber('amount', true);
        const currency = interaction.options.getString('currency', true) as LedgerCurrency;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const entry = await setLedgerOpening.execute({
                amount,
                currency,
                actorDiscordId: interaction.user.id,
            });
            const { balanceBrlCents } = await getBalance.execute();

            await interaction.followUp({
                content: `✅ Opening balance recorded: ${formatLedgerEntryAmount({ entry })}. New balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
                flags: MessageFlags.Ephemeral
            });

            await postOpeningToMoneyChannel({ discordClient, moneyChannelId, entry, balanceBrlCents, interaction });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}

type PostOpeningParams = {
    discordClient: Client;
    moneyChannelId: string;
    entry: LedgerTransaction;
    balanceBrlCents: number;
    interaction: ChatInputCommandInteraction;
};

async function postOpeningToMoneyChannel(params: PostOpeningParams): Promise<void> {
    const { discordClient, moneyChannelId, entry, balanceBrlCents, interaction } = params;
    const delivered = await sendMoneyChannelMessage({
        discordClient,
        moneyChannelId,
        content: `💰 Opening balance recorded: ${formatLedgerEntryAmount({ entry })} from "${entry.source}". Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
    });
    if (!delivered) {
        await interaction.followUp({
            content: '⚠️ Opening balance recorded, but it could not be posted to #money.',
            flags: MessageFlags.Ephemeral
        });
    }
}
