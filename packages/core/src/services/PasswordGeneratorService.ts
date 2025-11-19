/**
 * Service interface for password generation
 */
export interface PasswordGeneratorService {
    generatePassword(settings: {
        alpha?: boolean;
        length?: number;
        numeric?: boolean;
        symbols?: boolean;
    }): string;

    generateNumericPassword(settings: { min: number, max: number }): number;
}
