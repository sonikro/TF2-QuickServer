import { PasswordGeneratorService } from "../services/PasswordGeneratorService";

/**
 * Immutable value object containing all server authentication credentials
 */
export class ServerCredentials {
    public readonly serverPassword: string;
    public readonly rconPassword: string;
    public readonly tvPassword: string;
    public readonly logSecret: number;

    constructor(data: {
        serverPassword: string;
        rconPassword: string;
        tvPassword: string;
        logSecret: number;
    }) {
        this.serverPassword = data.serverPassword;
        this.rconPassword = data.rconPassword;
        this.tvPassword = data.tvPassword;
        this.logSecret = data.logSecret;
    }

    /**
     * Creates ServerCredentials with generated passwords
     */
    static generate(passwordGeneratorService: PasswordGeneratorService, options?: { publicServer?: boolean }): ServerCredentials {
        const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false, };

        return new ServerCredentials({
            serverPassword: options?.publicServer ? '' : passwordGeneratorService.generatePassword(passwordSettings),
            rconPassword: passwordGeneratorService.generatePassword(passwordSettings),
            tvPassword: options?.publicServer ? '' : passwordGeneratorService.generatePassword(passwordSettings),
            logSecret: passwordGeneratorService.generateNumericPassword({ min: 1, max: 999999 })
        });
    }
}
