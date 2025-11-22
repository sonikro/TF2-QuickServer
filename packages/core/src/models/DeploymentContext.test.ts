import { Chance } from "chance";
import { describe, expect, it, vi } from "vitest";
import { Region, Variant } from "../domain";
import { StatusUpdater } from "../services/StatusUpdater";
import { DeploymentContext } from "./DeploymentContext";

const chance = new Chance();

describe("DeploymentContext", () => {
    const createTestEnvironment = () => {
        const mockStatusUpdater = vi.fn() as StatusUpdater;

        const validRegions = Object.values(Region);
        const region = chance.pickone(validRegions);
        const variantName = chance.pickone(["standard-competitive", "casual", "vanilla"]) as Variant;
        const serverId = chance.guid();
        const sourcemodAdminSteamId = chance.string({ length: 17, pool: '0123456789' });
        const extraEnvs = {
            TEST_ENV: chance.word(),
            ANOTHER_ENV: chance.word()
        };

        return {
            mocks: {
                statusUpdater: mockStatusUpdater
            },
            data: {
                region,
                variantName,
                serverId,
                sourcemodAdminSteamId,
                extraEnvs
            }
        };
    };

    describe("constructor", () => {
        it("should create a DeploymentContext with all required properties", () => {
            const { mocks, data } = createTestEnvironment();

            const context = new DeploymentContext({
                serverId: data.serverId,
                region: data.region,
                variantName: data.variantName,
                statusUpdater: mocks.statusUpdater,
                sourcemodAdminSteamId: data.sourcemodAdminSteamId,
                extraEnvs: data.extraEnvs
            });

            expect(context.serverId).toBe(data.serverId);
            expect(context.region).toBe(data.region);
            expect(context.variantName).toBe(data.variantName);
            expect(context.statusUpdater).toBe(mocks.statusUpdater);
            expect(context.sourcemodAdminSteamId).toBe(data.sourcemodAdminSteamId);
            expect(context.extraEnvs).toEqual(data.extraEnvs);
        });

        it("should create a DeploymentContext with minimum required properties", () => {
            const { mocks, data } = createTestEnvironment();

            const context = new DeploymentContext({
                serverId: data.serverId,
                region: data.region,
                variantName: data.variantName,
                statusUpdater: mocks.statusUpdater
            });

            expect(context.serverId).toBe(data.serverId);
            expect(context.region).toBe(data.region);
            expect(context.variantName).toBe(data.variantName);
            expect(context.statusUpdater).toBe(mocks.statusUpdater);
            expect(context.sourcemodAdminSteamId).toBeUndefined();
            expect(context.extraEnvs).toEqual({});
        });

        it("should default extraEnvs to empty object when not provided", () => {
            const { mocks, data } = createTestEnvironment();

            const context = new DeploymentContext({
                serverId: data.serverId,
                region: data.region,
                variantName: data.variantName,
                statusUpdater: mocks.statusUpdater,
                sourcemodAdminSteamId: data.sourcemodAdminSteamId
            });

            expect(context.extraEnvs).toEqual({});
        });

    });

    describe("uuidPrefix getter", () => {
        it("should return the first part of serverId when separated by hyphens", () => {
            const { mocks, data } = createTestEnvironment();
            const serverId = "abc123-def456-ghi789";

            const context = new DeploymentContext({
                serverId,
                region: data.region,
                variantName: data.variantName,
                statusUpdater: mocks.statusUpdater
            });

            expect(context.uuidPrefix).toBe("abc123");
        });


    });

});
