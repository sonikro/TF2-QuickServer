import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from "discord.js";
import { CreateCreditsPurchaseOrder } from "@tf2qs/core";

export function createBuyCreditsCommandHandlerFactory(dependencies: {
    createCreditsPurchaseOrder: CreateCreditsPurchaseOrder
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const creditsAmount = interaction.options.getInteger('credits')!;

        const { createCreditsPurchaseOrder } = dependencies;

        const creditOrder = await createCreditsPurchaseOrder.execute({
            creditsAmount,
            userId: interaction.user.id,
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('💸 Pay Now')
                .setStyle(ButtonStyle.Link)
                .setURL(creditOrder.link)
        );

        await interaction.reply({
            content: `🧾 You're purchasing **${creditsAmount}** credits. Click the button below to pay:`,
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
}
