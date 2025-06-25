import { describe, it, expect, vi } from "vitest";
import { say } from "./Say";
import { mock } from "vitest-mock-extended";
import { ServerRepository } from "../../../core/repository/ServerRepository";
import { UserRepository } from "../../../core/repository/UserRepository";
import { ServerCommander } from "../../../core/services/ServerCommander";
import { ServerManager } from "../../../core/services/ServerManager";
import { UserBanRepository } from "../../../core/repository/UserBanRepository";
import { User } from "../../../core/domain/User";
import { Server } from "../../../core/domain/DeployedServer";

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
            const serverRepository = mock<ServerRepository>();
            const userRepository = mock<UserRepository>();
            const serverCommander = mock<ServerCommander>();
            const serverManager = mock<ServerManager>();
            const userBanRepository = mock<UserBanRepository>();
            const command = say(rawString);
            const handler = command?.handler;
            return { serverRepository, userRepository, serverCommander, serverManager, userBanRepository, command, handler };
        }

        it("should terminate the server if user is creator and says !terminate", async () => {
            const { serverRepository, userRepository, serverCommander, serverManager, userBanRepository, command, handler } = createTestEnvironment();
            serverRepository.findById.mockResolvedValue(fakeServer);
            userRepository.findBySteamId.mockResolvedValue(fakeUser);
            serverCommander.query.mockResolvedValue("");
            serverManager.deleteServer.mockResolvedValue();
            serverRepository.deleteServer.mockResolvedValue();

            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: serverId,
                services: {
                    serverRepository,
                    userRepository,
                    serverCommander,
                    serverManager,
                    userBanRepository
                }
            });
            expect(serverCommander.query).toHaveBeenCalledWith(expect.objectContaining({
                host: fakeServer.rconAddress,
                port: 27015,
                password: fakeServer.rconPassword,
                command: expect.stringContaining("Server is being terminated"),
                timeout: 5000
            }));
            expect(serverManager.deleteServer).toHaveBeenCalledWith(expect.objectContaining({
                region: fakeServer.region,
                serverId: fakeServer.serverId
            }));
            expect(serverRepository.deleteServer).toHaveBeenCalledWith(fakeServer.serverId);
        });

        it("should not terminate if user is not creator", async () => {
            const { serverRepository, userRepository, serverCommander, serverManager, userBanRepository, command, handler } = createTestEnvironment();
            serverRepository.findById.mockResolvedValue(fakeServer);
            userRepository.findBySteamId.mockResolvedValue({ id: "99", steamIdText: "U:1:999999" });
            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: serverId,
                services: {
                    serverRepository,
                    userRepository,
                    serverCommander,
                    serverManager,
                    userBanRepository
                }
            });
            expect(serverCommander.query).not.toHaveBeenCalled();
            expect(serverManager.deleteServer).not.toHaveBeenCalled();
            expect(serverRepository.deleteServer).not.toHaveBeenCalled();
        });
    });
});
