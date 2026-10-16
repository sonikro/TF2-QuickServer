import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { describe, expect, it } from "vitest";
import { setLedgerOpeningCommandDefinition } from "./definition";

describe("setLedgerOpeningCommandDefinition", () => {
    const amountOption = () => setLedgerOpeningCommandDefinition.toJSON().options?.find((option) => option.name === "amount");

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

    it("should be restricted to administrators and marked owner only", () => {
        // When
        const definition = setLedgerOpeningCommandDefinition.toJSON();

        // Then
        expect(definition.name).toBe("set-ledger-opening");
        expect(definition.description).toContain("(owner only)");
        expect(definition.default_member_permissions).toBe(String(PermissionFlagsBits.Administrator));
    });

    it("should offer only the supported currencies", () => {
        // When
        const option = setLedgerOpeningCommandDefinition.toJSON().options?.find((option) => option.name === "currency");

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
