import { GracefulShutdownManager } from "../../core/services/GracefulShutdownManager";

// Define a custom error type for shutdown exceptions
export class ShutdownInProgressError extends Error {
    constructor(message: string = "Cannot run action, the application is already shutting down.") {
        super(message);
        this.name = "ShutdownInProgressError";
    }
}

/**
 * Manages graceful shutdown of asynchronous actions within an application.
 * 
 * The `DefaultGracefulShutdownManager` tracks ongoing asynchronous actions and ensures that,
 * upon shutdown, all registered actions are allowed to complete before the application exits.
 * 
 * - New actions can be registered using the `run` method, which tracks their completion.
 * - Once shutdown is initiated via `onShutdownWait`, no new actions can be started,
 *   and the manager waits for all tracked actions to settle before completing the shutdown process.
 * 
 * @implements {GracefulShutdownManager}
 * 
 * @example
 * ```typescript
 * const manager = new DefaultGracefulShutdownManager();
 * manager.run(async () => {
 *   // perform some async work
 * });
 * // Later, during shutdown:
 * await manager.onShutdownWait();
 * ```
 */
export class DefaultGracefulShutdownManager implements GracefulShutdownManager {

    private readonly shutdownPromises: Set<Promise<any>> = new Set();
    private shuttingDown: boolean = false;

    run<T>(action: () => Promise<T>): Promise<T> {
        if (this.shuttingDown) {
            console.log("[GracefulShutdownManager] Cannot run action, the application is already shutting down.");
            throw new ShutdownInProgressError();
        }
        console.log("[GracefulShutdownManager] Running new action...");
        const promise = action();
        this.shutdownPromises.add(promise);
        // Remove the promise from the set once it settles
        promise.finally(() => {
            this.shutdownPromises.delete(promise);
            console.log("[GracefulShutdownManager] Action settled. Remaining:", this.shutdownPromises.size);
        });
        return promise;
    }

    async onShutdownWait(): Promise<void> {
        this.shuttingDown = true;
        console.log("[GracefulShutdownManager] Shutdown initiated. Waiting for", this.shutdownPromises.size, "actions to complete...");
        await Promise.allSettled(Array.from(this.shutdownPromises));
        this.shutdownPromises.clear(); // Clear the set after resolving
        console.log("[GracefulShutdownManager] All actions settled. Shutdown complete.");
    }

}

export const defaultGracefulShutdownManager = new DefaultGracefulShutdownManager();