import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { rcon } from "./Rcon";
import { publicIpv4 } from "public-ip";
import { logger } from "../../../telemetry/otel";

vi.mock("public-ip", () => ({
    publicIpv4: vi.fn()
}));

vi.mock("../../../telemetry/otel", () => ({
    logger: {
        emit: vi.fn()
    }
}));

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

    describe("handler for status command", () => {
        const rawString = 'rcon from "1.2.3.4:51736": command "status"';
        const fakeServer = {
            serverId: "test-server",
            region: "us-east",
            variant: "test-variant",
            hostIp: "127.0.0.1",
            hostPort: 27015,
            tvIp: "127.0.0.1",
            tvPort: 27020,
            rconPassword: "rconpass",
            rconAddress: "127.0.0.1",
            createdBy: "42",
            status: "ready"
        };
        let services: any;
        let loggerEmit: ReturnType<typeof vi.spyOn>;
        beforeEach(() => {
            services = mockDeep();
            services.serverRepository.findByLogsecret.mockResolvedValue(fakeServer);
            services.serverCommander.query.mockResolvedValue("");
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("should do nothing if public IP matches sourceIp", async () => {
            // This means the status command is coming from TF2-QuickServer itself
            vi.mocked(publicIpv4).mockResolvedValue("1.2.3.4");
            const command = rcon(rawString);
            if (!command || !command.handler) throw new Error("No handler");
            await command.handler({ args: command.args, password: "123", services });
            expect(services.serverCommander.query).not.toHaveBeenCalled();
            // Should not emit a warning
            expect(vi.mocked(logger.emit)).not.toHaveBeenCalledWith(expect.objectContaining({ severityText: 'WARN' }), expect.anything());
        });

        it("should issue warning if public IP does not match sourceIp", async () => {
            // This means the status command is coming from someone else
            vi.mocked(publicIpv4).mockResolvedValue("5.6.7.8");
            const command = rcon(rawString);
            if (!command || !command.handler) throw new Error("No handler");
            await command.handler({ args: command.args, password: "123", services });
            expect(services.serverCommander.query).toHaveBeenCalledWith(expect.objectContaining({
                host: fakeServer.rconAddress,
                port: 27015,
                password: fakeServer.rconPassword,
                command: expect.stringContaining("Warning: An unexpected STATUS command was received"),
                timeout: 5000
            }));
            expect(vi.mocked(logger.emit)).toHaveBeenCalledWith({
                severityText: 'WARN',
                body: `Unexpected STATUS command from 1.2.3.4:51736 on server ${fakeServer.serverId}. This could indicate an unauthorized attempt to access player IP addresses.`,
                attributes: { serverId: fakeServer.serverId, sourceIp: "1.2.3.4:51736", command: "status" }
            });
        });
    });
});
