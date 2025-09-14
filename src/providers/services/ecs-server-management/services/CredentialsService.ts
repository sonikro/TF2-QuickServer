import { ServerCredentials } from '../models/ServerCredentials';
import { PasswordGeneratorService } from './PasswordGeneratorService';

/**
 * Service responsible for generating all server credentials
 */
export interface CredentialsService {
    generateCredentials(): ServerCredentials;
}

export class DefaultCredentialsService implements CredentialsService {
    constructor(
        private readonly passwordGeneratorService: PasswordGeneratorService,
        private readonly chance: Chance.Chance
    ) {}

    generateCredentials(): ServerCredentials {
        return ServerCredentials.generate(
            (settings) => this.passwordGeneratorService.generatePassword(settings),
            this.chance
        );
    }
}
