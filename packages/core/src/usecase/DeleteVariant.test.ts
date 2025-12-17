import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { DeleteVariant } from "./DeleteVariant";
import { VariantRepository } from "../repository/VariantRepository";
import { GuildVariant } from "../domain/GuildVariant";

describe("DeleteVariant", () => {
    const makeSut = () => {
        const variantRepository = mock<VariantRepository>();
        const sut = new DeleteVariant({ variantRepository });
        return { sut, variantRepository };
    };

    it("should delete a variant when it exists", async () => {
        const { sut, variantRepository } = makeSut();
        
        const params = {
            guildId: "guild123",
            variantName: "variant-to-delete",
        };

        const existingVariant: GuildVariant = {
            id: 1,
            guildId: params.guildId,
            variantName: params.variantName,
            displayName: "Variant to Delete",
        };

        when(variantRepository.findByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(existingVariant);

        when(variantRepository.deleteByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(undefined);

        await sut.execute(params);

        expect(variantRepository.deleteByGuildIdAndName).toHaveBeenCalledWith({
            guildId: params.guildId,
            variantName: params.variantName,
        });
    });

    it("should throw error when variant does not exist", async () => {
        const { sut, variantRepository } = makeSut();
        
        const params = {
            guildId: "guild123",
            variantName: "non-existent-variant",
        };

        when(variantRepository.findByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(null);

        await expect(sut.execute(params)).rejects.toThrow(
            `Variant ${params.variantName} does not exist for this guild`
        );
        expect(variantRepository.deleteByGuildIdAndName).not.toHaveBeenCalled();
    });
});
