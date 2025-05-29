export interface GracefulShutdownManager {
    /**
     * Tracks a promise to ensure it resolves before the application shuts down.
     * If the application is already shutting down, it throws an error and does not calls the action.
     */
    run<T>(action: () => Promise<T>): Promise<T>;
    /**
     * Waits for all tracked promises to resolve before allowing the application to shut down.
     */
    onShutdownWait(): Promise<void>;
}