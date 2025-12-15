import { describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CreateVariant } from "./CreateVariant";
import { VariantRepository } from "../repository/VariantRepository";
import { GuildVariant } from "../domain/GuildVariant";

describe("CreateVariant", () => {
    const makeSut = () => {
        const variantRepository = mock<VariantRepository>();
        const sut = new CreateVariant({ variantRepository });
        return { sut, variantRepository };
    };

    it("should create a new variant when it does not exist", async () => {
        const { sut, variantRepository } = makeSut();
        
        const params = {
            guildId: "guild123",
            variantName: "custom-variant",
            displayName: "Custom Variant",
            hostname: "Custom Server | {region}",
            defaultCfgs: { "5cp": "custom.cfg" },
            admins: ["STEAM_0:1:12345"],
            image: "custom/image:latest",
            emptyMinutesTerminate: 15,
        };

        when(variantRepository.findByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(null);

        const expectedVariant: GuildVariant = {
            id: 1,
            guildId: params.guildId,
            variantName: params.variantName,
            displayName: params.displayName,
            hostname: params.hostname,
            defaultCfgs: params.defaultCfgs,
            admins: params.admins,
            image: params.image,
            emptyMinutesTerminate: params.emptyMinutesTerminate,
        };

        when(variantRepository.create)
            .calledWith({ variant: expect.objectContaining({ guildId: params.guildId }) })
            .mockResolvedValue(expectedVariant);

        const result = await sut.execute(params);

        expect(result).toEqual(expectedVariant);
        expect(variantRepository.create).toHaveBeenCalledWith({
            variant: expect.objectContaining({
                guildId: params.guildId,
                variantName: params.variantName,
                displayName: params.displayName,
            }),
        });
    });

    it("should throw error when variant already exists", async () => {
        const { sut, variantRepository } = makeSut();
        
        const params = {
            guildId: "guild123",
            variantName: "existing-variant",
            displayName: "Existing Variant",
        };

        const existingVariant: GuildVariant = {
            id: 1,
            guildId: params.guildId,
            variantName: params.variantName,
            displayName: params.displayName,
        };

        when(variantRepository.findByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(existingVariant);

        await expect(sut.execute(params)).rejects.toThrow(
            `Variant ${params.variantName} already exists for this guild`
        );
        expect(variantRepository.create).not.toHaveBeenCalled();
    });

    it("should create variant with minimal required fields", async () => {
        const { sut, variantRepository } = makeSut();
        
        const params = {
            guildId: "guild123",
            variantName: "minimal-variant",
            displayName: "Minimal Variant",
        };

        when(variantRepository.findByGuildIdAndName)
            .calledWith({ guildId: params.guildId, variantName: params.variantName })
            .mockResolvedValue(null);

        const expectedVariant: GuildVariant = {
            id: 1,
            guildId: params.guildId,
            variantName: params.variantName,
            displayName: params.displayName,
        };

        when(variantRepository.create)
            .calledWith({ variant: expect.objectContaining({ guildId: params.guildId }) })
            .mockResolvedValue(expectedVariant);

        const result = await sut.execute(params);

        expect(result).toEqual(expectedVariant);
    });
});
