import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { UDPCommandsServices } from "./UDPCommandServices";
import { userEnteredGame } from "./UserEnteredGame";

describe("userEnteredGame command parser", () => {
    it("should create a userEnteredGame command if rawString matches", () => {
        const rawString = '06/22/2025 - 22:33:41: "sonikro<6><[U:1:29162964]><>" entered the game';
        const result = userEnteredGame(rawString);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("userEnteredGame");
        expect(result?.args).toEqual({ userId: "6", steamId3: "U:1:29162964" });
    });

    describe("handler", () => {
        const rawString = '06/22/2025 - 22:33:41: "sonikro<6><[U:1:29162964]><>" entered the game';
        const serverId = "test-server";
        const fakeServer = {
            rconAddress: "127.0.0.1",
            rconPassword: "rconpass"
        };

        function createTestEnvironment() {
            const services = mockDeep<UDPCommandsServices>();
            const command = userEnteredGame(rawString);
            const handler = command?.handler;
            return { services, command, handler };
        }

        it("should ban the user if user is banned", async () => {
            const { services, command, handler } = createTestEnvironment();
            when(services.userBanRepository.isUserBanned)
                .calledWith("U:1:29162964")
                .thenResolve({ isBanned: true, reason: "Cheating" });
            when(services.serverRepository.findById)
                .calledWith(serverId)
                .thenResolve(fakeServer as any);
            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: serverId,
                services
            });
            expect(services.serverCommander.query).toHaveBeenCalledWith(expect.objectContaining({
                host: fakeServer.rconAddress,
                port: 27015,
                password: fakeServer.rconPassword,
                command: expect.stringContaining("sm_ban #6 0 Cheating"),
                timeout: 5000
            }));
        });

        it("should not ban user if user is not banned", async () => {
            const { services, command, handler } = createTestEnvironment();
            when(services.userBanRepository.isUserBanned)
                .calledWith("U:1:29162964")
                .thenResolve({ isBanned: false });
            if (!command || !handler) throw new Error("Command or handler is undefined");
            await handler({
                args: command.args,
                password: serverId,
                services
            });
            expect(services.serverCommander.query).not.toHaveBeenCalled();
        });
    });
});
