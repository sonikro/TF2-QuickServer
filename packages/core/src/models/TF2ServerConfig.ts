import { ServerCredentials } from './ServerCredentials';

/**
 * Immutable value object holding all TF2-server-specific parameters.
 * Provider-agnostic: cloud providers map these fields to their own API schemas.
 */
export class TF2ServerConfig {
    public readonly credentials: ServerCredentials;
    public readonly environmentVariables: Record<string, string>;
    public readonly containerImage: string;
    public readonly startupMap: string;
    public readonly maxPlayers: number;
    public readonly svPure: number;
    /** Provider-neutral argument list, e.g. ["+map", "cp_badlands", "+maxplayers", "24"] */
    public readonly containerArgs: string[];

    constructor(data: {
        credentials: ServerCredentials;
        environmentVariables: Record<string, string>;
        containerImage: string;
        startupMap: string;
        maxPlayers: number;
        svPure: number;
        containerArgs: string[];
    }) {
        this.credentials = data.credentials;
        this.environmentVariables = data.environmentVariables;
        this.containerImage = data.containerImage;
        this.startupMap = data.startupMap;
        this.maxPlayers = data.maxPlayers;
        this.svPure = data.svPure;
        this.containerArgs = data.containerArgs;
    }
}
