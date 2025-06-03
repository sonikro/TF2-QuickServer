import { describe, beforeEach, it, expect } from "vitest";
import { DefaultServerAbortManager } from "./DefaultServerAbortManager";

describe("DefaultServerAbortManager", () => {
    let manager: DefaultServerAbortManager;

    beforeEach(() => {
        manager = new DefaultServerAbortManager();
    });

    it("should create and retrieve an AbortController by id", () => {
        const id = "test1";
        const controller = manager.getOrCreate(id);
        expect(controller).toBeInstanceOf(AbortController);
        expect(manager.getOrCreate(id)).toBe(controller);
    });

    it("should return the same AbortController for the same id", () => {
        const id = "test2";
        const controller1 = manager.getOrCreate(id);
        const controller2 = manager.getOrCreate(id);
        expect(controller1).toBe(controller2);
    });

    it("should return a new AbortController after delete", () => {
        const id = "test3";
        const controller1 = manager.getOrCreate(id);
        manager.delete(id);
        const controller2 = manager.getOrCreate(id);
        expect(controller2).toBeInstanceOf(AbortController);
        expect(controller2).not.toBe(controller1);
    });

    it("should allow aborting via the controller", () => {
        const id = "test4";
        const controller = manager.getOrCreate(id);
        controller.abort();
        expect(controller.signal.aborted).toBe(true);
    });
});
