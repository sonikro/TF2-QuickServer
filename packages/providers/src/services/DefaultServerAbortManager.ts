import { ServerAbortManager } from "@tf2qs/core";

export class DefaultServerAbortManager implements ServerAbortManager 
{
    private controllers: Map<string, AbortController> = new Map();

    getOrCreate(id: string): AbortController {
        if (this.controllers.has(id)) {
            return this.controllers.get(id)!;
        }
        const controller = new AbortController();
        this.controllers.set(id, controller);
        return controller;
    }

    has(id: string): boolean {
        return this.controllers.has(id);
    }

    delete(id: string): void {
        this.controllers.delete(id);
    }
}