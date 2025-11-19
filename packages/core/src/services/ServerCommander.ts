export interface ServerCommander {
    query(args: {
        host: string,
        port: number,
        password: string,
        command: string,
        timeout?: number,
    }): Promise<string>;
}