export function waitUntil<T>(
    condition: () => Promise<T>,
    options: {
        interval?: number;
        timeout?: number;
    } = {}
): Promise<T> {
    const { interval = 1000, timeout = 30000 } = options;

    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkCondition = async () => {
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