import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetVariantsForGuild } from "./GetVariantsForGuild";
import { VariantRepository } from "../repository/VariantRepository";
import { GuildVariant } from "../domain/GuildVariant";

describe("GetVariantsForGuild", () => {
    const makeSut = () => {
        const variantRepository = mock<VariantRepository>();
        const sut = new GetVariantsForGuild({ variantRepository });
        return { sut, variantRepository };
    };

    it("should return all variants for a guild", async () => {
        const { sut, variantRepository } = makeSut();
        
        const guildId = "guild123";
        const expectedVariants: GuildVariant[] = [
            {
                id: 1,
                guildId,
                variantName: "variant1",
                displayName: "Variant 1",
            },
            {
                id: 2,
                guildId,
                variantName: "variant2",
                displayName: "Variant 2",
            },
        ];

        when(variantRepository.findByGuildId)
            .calledWith({ guildId })
            .mockResolvedValue(expectedVariants);

        const result = await sut.execute({ guildId });

        expect(result).toEqual(expectedVariants);
        expect(variantRepository.findByGuildId).toHaveBeenCalledWith({ guildId });
    });

    it("should return empty array when guild has no variants", async () => {
        const { sut, variantRepository } = makeSut();
        
        const guildId = "guild123";

        when(variantRepository.findByGuildId)
            .calledWith({ guildId })
            .mockResolvedValue([]);

        const result = await sut.execute({ guildId });

        expect(result).toEqual([]);
    });
});
