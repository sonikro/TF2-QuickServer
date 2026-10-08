export interface Tf2VersionReader {
    getCurrentVersion(params: {
        repository: string;
    }): Promise<string>;
}
