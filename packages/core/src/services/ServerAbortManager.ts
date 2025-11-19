export class AbortError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AbortError";
    }
}

export interface ServerAbortManager {
    getOrCreate(id: string): AbortController;
    delete(id: string): void;
}