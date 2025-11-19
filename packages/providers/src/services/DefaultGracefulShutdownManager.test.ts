import { describe, it, expect, vi } from "vitest";
import { DefaultGracefulShutdownManager } from "./DefaultGracefulShutdownManager";

describe("DefaultGracefulShutdownManager", () => {
    it("runs an action and resolves its result", async () => {
        const mgr = new DefaultGracefulShutdownManager();
        const action = vi.fn().mockResolvedValue(42);

        const result = await mgr.run(action);

        expect(result).toBe(42);
        expect(action).toHaveBeenCalledTimes(1);
    });

    it("removes promise from set after it settles", async () => {
        const mgr = new DefaultGracefulShutdownManager();
        const action = vi.fn().mockResolvedValue("done");

        await mgr.run(action);
        // @ts-expect-private: Access for test
        // @ts-ignore
        expect(mgr.shutdownPromises.size).toBe(0);
    });

    it("throws if run is called after shutdown started", async () => {
        const mgr = new DefaultGracefulShutdownManager();
        await mgr.run(() => Promise.resolve("ok"));
        await mgr.onShutdownWait();

        expect(() =>
            mgr.run(() => Promise.resolve("fail"))
        ).toThrowError("Cannot run action, the application is already shutting down.");
    });

    it("waits for all running actions to settle on shutdown", async () => {
        const mgr = new DefaultGracefulShutdownManager();
        let resolveA: (v: string) => void;
        let resolveB: (v: string) => void;
        const promiseA = new Promise<string>(res => { resolveA = res; });
        const promiseB = new Promise<string>(res => { resolveB = res; });

        mgr.run(() => promiseA);
        mgr.run(() => promiseB);

        const shutdownPromise = mgr.onShutdownWait();

        // Not resolved yet, so shutdownPromise should not be resolved
        let shutdownResolved = false;
        shutdownPromise.then(() => { shutdownResolved = true; });

        await Promise.resolve(); // allow event loop to process

        expect(shutdownResolved).toBe(false);

        resolveA!("A");
        resolveB!("B");

        await shutdownPromise;
        expect(shutdownResolved).toBe(true);
        // @ts-ignore
        expect(mgr.shutdownPromises.size).toBe(0);
    });

    it("clears shutdownPromises after shutdown", async () => {
        const mgr = new DefaultGracefulShutdownManager();
        await mgr.run(() => Promise.resolve("foo"));
        await mgr.onShutdownWait();
        // @ts-ignore
        expect(mgr.shutdownPromises.size).toBe(0);
    });
});