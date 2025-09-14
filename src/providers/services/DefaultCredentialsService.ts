import { ServerCredentials } from '../../core/models/ServerCredentials';
import { PasswordGeneratorService } from '../../core/services/PasswordGeneratorService';
import { CredentialsService } from '../../core/services/CredentialsService';

/**
 * Default implementation of CredentialsService
 */
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
