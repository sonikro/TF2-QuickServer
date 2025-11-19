import { AbortError } from "@tf2qs/core/src/services/ServerAbortManager";

export function waitUntil<T>(
    condition: () => Promise<T>,
    options: {
        interval?: number;
        timeout?: number;
        /**
         * Optional AbortSignal to cancel the wait operation.
         */
        signal?: AbortSignal;
    } = {}
): Promise<T> {
    const { interval = 1000, timeout = 30000 } = options;

    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkCondition = async () => {
            // Check if the operation has been aborted
            if (options.signal?.aborted) {
                return reject(new AbortError("Operation aborted"));
            }
            try {
                const result = await condition();
                resolve(result);
            } catch (error) {
                if (Date.now() - startTime >= timeout) {
                    reject(`Timeout after ${timeout}ms: ${error}`);
                } else {
                    setTimeout(checkCondition, interval);
                }
            }
        };

        checkCondition();
    });
}