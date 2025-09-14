/**
 * Immutable value object containing container configuration
 */
export class ContainerConfig {
    public readonly name: string;
    public readonly image: string;
    public readonly essential: boolean;
    public readonly environment: Array<{ name: string; value: string }>;
    public readonly portMappings: Array<{
        containerPort: number;
        hostPort: number;
        protocol: string;
    }>;
    public readonly logConfiguration?: {
        logDriver: string;
        options: Record<string, string>;
    };

    constructor(data: {
        name: string;
        image: string;
        essential: boolean;
        environment: Array<{ name: string; value: string }>;
        portMappings: Array<{
            containerPort: number;
            hostPort: number;
            protocol: string;
        }>;
        logConfiguration?: {
            logDriver: string;
            options: Record<string, string>;
        };
    }) {
        this.name = data.name;
        this.image = data.image;
        this.essential = data.essential;
        this.environment = data.environment;
        this.portMappings = data.portMappings;
        this.logConfiguration = data.logConfiguration;
    }
}
