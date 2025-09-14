import { Chance } from "chance";
import { PasswordGeneratorService } from "../../core/services/PasswordGeneratorService";

/**
 * Implementation of PasswordGeneratorService using the Chance library
 */
export class ChancePasswordGeneratorService implements PasswordGeneratorService {
    private readonly chance = new Chance();

    generatePassword(settings: {
        alpha?: boolean;
        length?: number;
        numeric?: boolean;
        symbols?: boolean;
    }): string {
        const { length = 12, alpha = true, numeric = true, symbols = true } = settings;

        const options = {
            length,
            alpha,
            numeric,
            symbols
        };

        return this.chance.string(options);
    }
    generateNumericPassword(settings: { min: number; max: number; }): number {
        return this.chance.integer(settings);
    }
}
