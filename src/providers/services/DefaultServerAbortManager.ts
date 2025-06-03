import { ServerAbortManager } from "../../core/services/ServerAbortManager";

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

    delete(id: string): void {
        this.controllers.delete(id);
    }
}