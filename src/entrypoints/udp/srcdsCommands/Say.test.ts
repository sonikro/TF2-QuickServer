import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { Server } from "../../../core/domain/DeployedServer";
import { User } from "../../../core/domain/User";
import { ServerManager } from "../../../core/services/ServerManager";
import { say } from "./Say";
import { UDPCommandsServices } from "./UDPCommandServices";

describe("say command parser", () => {
    it("should parse a valid say command", () => {
        const rawString = '06/25/2025 - 02:43:46: "sonikro<3><[U:1:29162964]><Blue>" say "!terminate"';
        const result = say(rawString);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("say");
        expect(result?.args).toEqual({ userId: 3, steamId3: "U:1:29162964", message: "!terminate" });
    });

    it("should return null for non-matching string", () => {
        const rawString = 'invalid log line';
        const result = say(rawString);
        expect(result).toBeNull();
    });

    describe("handler", () => {
        const rawString = '06/25/2025 - 02:43:46: "sonikro<3><[U:1:29162964]><Blue>" say "!terminate"';
        const serverId = "test-server";
        const fakeServer: Server = {
            serverId: "test-server",
            region: "us-east" as any,
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
        const fakeUser: User = { id: "42", steamIdText: "U:1:29162964" };

        function createTestEnvironment() {
            const services = mockDeep<UDPCommandsServices>();
            const mockServerManager = mockDeep<ServerManager>();
            
            const command = say(rawString);
            const handler = command?.handler;
            return { services, command, handler, mockServerManager };
        }

        it("should terminate the server if user is creator and says !terminate", async () => {
            const { services, command, handler, mockServerManager } = createTestEnvironment();
            services.serverRepository.findByLogsecret.mockResolvedValue(fakeServer);
            services.userRepository.findBySteamId.mockResolvedValue(fakeUser);
            services.serverCommander.query.mockResolvedValue("");
            services.backgroundTaskQueue.enqueue.mockResolvedValue("task-id");

            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: String(fakeServer.logSecret),
                services
            });
            expect(services.serverCommander.query).toHaveBeenCalledWith(expect.objectContaining({
                host: fakeServer.rconAddress,
                port: 27015,
                password: fakeServer.rconPassword,
                command: expect.stringContaining("Server is being terminated"),
                timeout: 5000
            }));
            expect(services.backgroundTaskQueue.enqueue).toHaveBeenCalledWith('delete-server-for-user', { userId: fakeUser.id }, undefined, {
                maxRetries: 10,
                initialDelayMs: 60000,
                maxDelayMs: 600000,
                backoffMultiplier: 2,
            });
        });

        it("should not terminate if user is not creator", async () => {
            const { services, command, handler, mockServerManager } = createTestEnvironment();
            services.serverRepository.findByLogsecret.mockResolvedValue(fakeServer);
            services.userRepository.findBySteamId.mockResolvedValue({ id: "99", steamIdText: "U:1:999999" });
            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: String(fakeServer.logSecret),
                services
            });
            expect(services.serverCommander.query).not.toHaveBeenCalled();
            expect(services.backgroundTaskQueue.enqueue).not.toHaveBeenCalled();
        });
    });
});
