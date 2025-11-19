/**
 * Enum representing supported cloud providers
 */
export enum CloudProvider {
    AWS = "aws",
    ORACLE = "oracle",
}

/**
 * Type guard to check if a string is a valid CloudProvider
 */
export function isValidCloudProvider(provider: string): provider is CloudProvider {
    return Object.values(CloudProvider).includes(provider as CloudProvider);
}
