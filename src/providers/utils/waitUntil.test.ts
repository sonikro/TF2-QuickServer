import { describe, it, expect, vi } from "vitest";
import { waitUntil } from "./waitUntil";

describe("waitUntil", () => {
    it("should resolve when the condition is met", async () => {
        const condition = vi.fn()
            .mockRejectedValueOnce(new Error("Not ready"))
            .mockResolvedValueOnce("Success");

        const result = await waitUntil(condition, { interval: 100, timeout: 1000 });
        expect(result).toBe("Success");
        expect(condition).toHaveBeenCalledTimes(2);
    });

    it("should reject when the timeout is reached", async () => {
        const condition = vi.fn().mockRejectedValue(new Error("Not ready"));

        await expect(waitUntil(condition, { interval: 100, timeout: 500 }))
            .rejects.toMatch("Timeout after 500ms: Error: Not ready");
        expect(condition).toHaveBeenCalled();
    });

    it("should use default interval and timeout if not provided", async () => {
        const condition = vi.fn()
            .mockRejectedValueOnce(new Error("Not ready"))
            .mockResolvedValueOnce("Success");

        const result = await waitUntil(condition);
        expect(result).toBe("Success");
        expect(condition).toHaveBeenCalledTimes(2);
    });

    it("should handle synchronous conditions", async () => {
        const condition = vi.fn()
            .mockImplementationOnce(() => Promise.reject(new Error("Not ready")))
            .mockImplementationOnce(() => Promise.resolve("Success"));

        const result = await waitUntil(condition, { interval: 100, timeout: 1000 });
        expect(result).toBe("Success");
        expect(condition).toHaveBeenCalledTimes(2);
    });

    it("should reject with AbortError if the operation is aborted", async () => {
        const controller = new AbortController();
        const condition = vi.fn().mockRejectedValue(new Error("Not ready"));

        setTimeout(() => controller.abort(), 100); // Abort after 100ms

        await expect(waitUntil(condition, { signal: controller.signal, interval: 100, timeout: 500 }))
            .rejects.toThrow("Operation aborted");
        expect(condition).toHaveBeenCalled();
    })
});