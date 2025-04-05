import { Chance } from "chance";
import { PasswordGenerator } from "../../core/utils/PasswordGenerator";

export const chancePasswordGenerator: PasswordGenerator = (args) => {
    const chance = new Chance();
    const { length = 12, alpha = true, numeric = true, symbols = true } = args || {};
    const options = {
        length,
        alpha,
        numeric,
        symbols
    };
    return chance.string(options);
}