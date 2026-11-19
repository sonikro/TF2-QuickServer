export class AbortError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AbortError";
    }
}

export interface ServerAbortManager {
    getOrCreate(id: string): AbortController;
    has(id: string): boolean;
    delete(id: string): void;
}