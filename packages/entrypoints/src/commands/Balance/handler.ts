import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetBalance, toDisplayBrl } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { requireMoneyOwner } from "../requireMoneyOwner";

type BalanceCommandHandlerFactoryDependencies = {
    getBalance: GetBalance;
    allowedUserIds: string[];
};

export function createBalanceCommandHandlerFactory(dependencies: BalanceCommandHandlerFactoryDependencies) {
    return async function balanceCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getBalance, allowedUserIds } = dependencies;

        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action: 'check the balance' });
        if (!authorized) {
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const { balanceBrlCents } = await getBalance.execute();
            await interaction.followUp({
                content: `💰 Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}
