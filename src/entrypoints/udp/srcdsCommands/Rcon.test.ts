import { describe, expect, it } from "vitest";
import { rcon } from "./Rcon";

describe("rcon command parser", () => {
    it("should parse a valid rcon command", () => {
        const rawString = 'rcon from "74.44.44.45:51736": command "status"';
        const result = rcon(rawString);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("rcon");
        expect(result?.args).toEqual({ sourceIp: "74.44.44.45:51736", command: "status" });
    });

    it("should parse a command with multiple words", () => {
        const rawString = 'rcon from "10.0.0.1:12345": command "changelevel cp_badlands"';
        const result = rcon(rawString);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("rcon");
        expect(result?.args).toEqual({ sourceIp: "10.0.0.1:12345", command: "changelevel cp_badlands" });
    });

    it("should return null for non-matching string", () => {
        const rawString = 'invalid log line';
        const result = rcon(rawString);
        expect(result).toBeNull();
    });
});
