import { describe, it, expect, beforeEach } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Knex } from "knex";
import { SQliteVariantRepository } from "./SQliteVariantRepository";
import { GuildVariant } from "@tf2qs/core";

describe("SQliteVariantRepository", () => {
    const makeSut = () => {
        const knex = mock<Knex>();
        const queryBuilder = mock<Knex.QueryBuilder>();
        
        when(knex).calledWith("guild_variants").mockReturnValue(queryBuilder as any);
        
        const sut = new SQliteVariantRepository({ knex });
        return { sut, knex, queryBuilder };
    };

    describe("create", () => {
        it("should create a new variant and return it with id", async () => {
            const { sut, queryBuilder } = makeSut();
            
            const variant: GuildVariant = {
                guildId: "guild123",
                variantName: "test-variant",
                displayName: "Test Variant",
                hostname: "Test Server",
                defaultCfgs: { "5cp": "test.cfg" },
                admins: ["STEAM_0:1:12345"],
                image: "test/image:latest",
                emptyMinutesTerminate: 15,
            };

            when(queryBuilder.insert)
                .calledWith(expect.objectContaining({
                    guild_id: variant.guildId,
                    variant_name: variant.variantName,
                }))
                .mockResolvedValue([1] as any);

            const result = await sut.create({ variant });

            expect(result).toEqual({ ...variant, id: 1 });
        });
    });

    describe("findByGuildIdAndName", () => {
        it("should return variant when it exists", async () => {
            const { sut, queryBuilder } = makeSut();
            
            const dbRow = {
                id: 1,
                guild_id: "guild123",
                variant_name: "test-variant",
                display_name: "Test Variant",
                hostname: "Test Server",
                default_cfgs: JSON.stringify({ "5cp": "test.cfg" }),
                admins: JSON.stringify(["STEAM_0:1:12345"]),
                image: "test/image:latest",
                empty_minutes_terminate: 15,
                created_at: new Date(),
                updated_at: new Date(),
            };

            when(queryBuilder.where)
                .calledWith({ guild_id: "guild123", variant_name: "test-variant" })
                .mockReturnValue(queryBuilder as any);

            when(queryBuilder.first)
                .calledWith()
                .mockResolvedValue(dbRow as any);

            const result = await sut.findByGuildIdAndName({
                guildId: "guild123",
                variantName: "test-variant",
            });

            expect(result).toEqual({
                id: dbRow.id,
                guildId: dbRow.guild_id,
                variantName: dbRow.variant_name,
                displayName: dbRow.display_name,
                hostname: dbRow.hostname,
                defaultCfgs: { "5cp": "test.cfg" },
                admins: ["STEAM_0:1:12345"],
                image: dbRow.image,
                emptyMinutesTerminate: dbRow.empty_minutes_terminate,
                createdAt: dbRow.created_at,
                updatedAt: dbRow.updated_at,
            });
        });

        it("should return null when variant does not exist", async () => {
            const { sut, queryBuilder } = makeSut();

            when(queryBuilder.where)
                .calledWith({ guild_id: "guild123", variant_name: "non-existent" })
                .mockReturnValue(queryBuilder as any);

            when(queryBuilder.first)
                .calledWith()
                .mockResolvedValue(undefined as any);

            const result = await sut.findByGuildIdAndName({
                guildId: "guild123",
                variantName: "non-existent",
            });

            expect(result).toBeNull();
        });
    });

    describe("findByGuildId", () => {
        it("should return all variants for a guild", async () => {
            const { sut, queryBuilder } = makeSut();
            
            const dbRows = [
                {
                    id: 1,
                    guild_id: "guild123",
                    variant_name: "variant1",
                    display_name: "Variant 1",
                    hostname: null,
                    default_cfgs: null,
                    admins: null,
                    image: null,
                    empty_minutes_terminate: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    id: 2,
                    guild_id: "guild123",
                    variant_name: "variant2",
                    display_name: "Variant 2",
                    hostname: null,
                    default_cfgs: null,
                    admins: null,
                    image: null,
                    empty_minutes_terminate: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];

            when(queryBuilder.where)
                .calledWith({ guild_id: "guild123" })
                .mockResolvedValue(dbRows as any);

            const result = await sut.findByGuildId({ guildId: "guild123" });

            expect(result).toHaveLength(2);
            expect(result[0].variantName).toBe("variant1");
            expect(result[1].variantName).toBe("variant2");
        });

        it("should return empty array when guild has no variants", async () => {
            const { sut, queryBuilder } = makeSut();

            when(queryBuilder.where)
                .calledWith({ guild_id: "guild123" })
                .mockResolvedValue([] as any);

            const result = await sut.findByGuildId({ guildId: "guild123" });

            expect(result).toEqual([]);
        });
    });

    describe("deleteByGuildIdAndName", () => {
        it("should delete a variant", async () => {
            const { sut, queryBuilder } = makeSut();

            when(queryBuilder.where)
                .calledWith({ guild_id: "guild123", variant_name: "variant-to-delete" })
                .mockReturnValue(queryBuilder as any);

            when(queryBuilder.delete)
                .calledWith()
                .mockResolvedValue(1 as any);

            await sut.deleteByGuildIdAndName({
                guildId: "guild123",
                variantName: "variant-to-delete",
            });

            expect(queryBuilder.delete).toHaveBeenCalled();
        });
    });
});
