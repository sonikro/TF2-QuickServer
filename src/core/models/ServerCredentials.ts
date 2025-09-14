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
    static generate(passwordGenerator: (settings: Partial<Chance.StringOptions>) => string, chance: Chance.Chance): ServerCredentials {
        const passwordSettings = { alpha: true, length: 10, numeric: true, symbols: false, };

        return new ServerCredentials({
            serverPassword: passwordGenerator(passwordSettings),
            rconPassword: passwordGenerator(passwordSettings),
            tvPassword: passwordGenerator(passwordSettings),
            logSecret: chance.integer({ min: 1, max: 999999 })
        });
    }
}
