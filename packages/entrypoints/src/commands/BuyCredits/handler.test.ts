import { Chance } from "chance";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CreditOrder } from "@tf2qs/core/src/domain/CreditOrder";
import { CreateCreditsPurchaseOrder } from "@tf2qs/core/src/usecase/CreateCreditsPurchaseOrder";
import { createBuyCreditsCommandHandlerFactory } from "./handler";

describe("createBuyCreditsCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock()
        const createCreditsPurchaseOrder = mock<CreateCreditsPurchaseOrder>();

        const requestedCredits = chance.integer({ min: 60, max: 5000 });
        interaction.options.getInteger = vi.fn(() => requestedCredits);
        const handler = createBuyCreditsCommandHandlerFactory({
            createCreditsPurchaseOrder
        });

        const creditOrder: CreditOrder = {
            amount: chance.integer({ min: 0, max: 1000 }),
            createdAt: new Date(),
            currency: 'USD',
            id: chance.guid(),
            link: chance.url(),
            status: 'pending',
            updatedAt: new Date(),
            userId: chance.guid(),
            credits: requestedCredits,
        }

        return {
            interaction,
            handler,
            mocks: {
                createCreditsPurchaseOrder,
            },
            values: {
                creditOrder,
                requestedCredits
            }
        }
    }

    const { handler, interaction, mocks, values } = createHandler();

    beforeAll(async () => {
        when(mocks.createCreditsPurchaseOrder.execute)
            .calledWith({
                userId: interaction.user.id,
                creditsAmount: values.requestedCredits
            })
            .thenResolve(values.creditOrder);
        await handler(interaction);
    })

    it("should call createCreditsPurchaseOrder with the correct values", () => {
        expect(mocks.createCreditsPurchaseOrder.execute).toHaveBeenCalledWith({
            userId: interaction.user.id,
            creditsAmount: values.requestedCredits
        });
    });

    it("should reply to the interaction with a payment link", () => {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('💸 Pay Now')
                .setStyle(ButtonStyle.Link)
                .setURL(values.creditOrder.link)
        );
        expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: `🧾 You're purchasing **${values.requestedCredits}** credits. Click the button below to pay:`,
            components: [row],
        }));
    })

    it("should make the reply ephemeral, so no one else can see it", () => {
        expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
            flags: MessageFlags.Ephemeral
        }));
    })

});