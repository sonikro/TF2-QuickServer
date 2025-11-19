import { User } from "../domain/User";
import { UserError } from "../errors/UserError";
import { UserRepository } from "../repository/UserRepository";

export class SetUserData {
    constructor(
        private readonly dependencies: {userRepository: UserRepository},
    ) {}

    async execute(args: {user: User}): Promise<void> {
        const { userRepository } = this.dependencies;
        const { user } = args;

        // Validate the Steam ID format
        const steamIdRegex = /^STEAM_[01]:[01]:\d+$/;
        if (!steamIdRegex.test(user.steamIdText)) {
            throw new UserError("Invalid Steam ID format. Expected format: STEAM_X:Y:Z");
        }
        await userRepository.upsert(user);
    }
}