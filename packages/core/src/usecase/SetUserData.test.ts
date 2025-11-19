import { Chance } from "chance";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { User } from "../domain/User";
import { UserError } from "../errors/UserError";
import { UserRepository } from "../repository/UserRepository";
import { SetUserData } from "./SetUserData";

describe("SetUserData", () => {

    const chance = new Chance();

    const createTestEnvironment = () => {

        const userRepository = mock<UserRepository>();
        const user = mock<User>();
        return {
            sut: new SetUserData({
                userRepository
            }),
            inputs: {
                user
            },
            dependencies: {
                userRepository
            }
        }
    }

    it("should validate the Steam ID Format", async () => {
        // Given
        const { sut, inputs } = createTestEnvironment();
        inputs.user.steamIdText = chance.string({ length: 20 });
        // When / Then
        expect(sut.execute({
            user: inputs.user
        })).rejects.toThrow(new UserError("Invalid Steam ID format. Expected format: STEAM_X:Y:Z"));
    })

    it("should persist the user data when steam id is valid", async () => {
        // Given
        const { sut, inputs, dependencies } = createTestEnvironment();
        inputs.user.steamIdText = "STEAM_0:1:12345678";
        // When
        await sut.execute({
            user: inputs.user
        });
        // Then
        expect(dependencies.userRepository.upsert).toHaveBeenCalledWith(inputs.user);
    })
})