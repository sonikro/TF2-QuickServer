import { ServerCredentials } from '../models/ServerCredentials';

/**
 * Service responsible for generating all server credentials
 */
export interface CredentialsService {
    generateCredentials(): ServerCredentials;
}
