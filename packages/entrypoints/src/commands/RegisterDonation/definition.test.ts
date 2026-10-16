import { ApplicationCommandOptionType } from "discord.js";
import { describe, expect, it } from "vitest";
import { registerDonationCommandDefinition } from "./definition";

describe("registerDonationCommandDefinition", () => {
    const amountOption = () => registerDonationCommandDefinition.toJSON().options?.find((option) => option.name === "amount");

    it("should require a positive amount above the zero the use case rejects", () => {
        // When
        const option = amountOption();

        // Then
        expect(option).toMatchObject({
            type: ApplicationCommandOptionType.Number,
            name: "amount",
            required: true,
            min_value: 0.01,
        });
    });

    it("should offer only the supported currencies", () => {
        // When
        const option = registerDonationCommandDefinition.toJSON().options?.find((option) => option.name === "currency");

        // Then
        expect(option).toMatchObject({
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "BRL", value: "BRL" },
                { name: "USD", value: "USD" },
            ],
        });
    });
});
