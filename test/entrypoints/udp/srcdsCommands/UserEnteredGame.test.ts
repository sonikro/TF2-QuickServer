import { describe, it, expect, vi, beforeEach } from "vitest";
import { userEnteredGame } from "../../../../src/entrypoints/udp/srcdsCommands/UserEnteredGame";

describe("userEnteredGame command parser", () => {
    it("should create a userEnteredGame command if rawString matches", () => {
        const rawString = '06/22/2025 - 22:33:41: "sonikro<6><[U:1:29162964]><>" entered the game';
        const result = userEnteredGame(rawString);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("userEnteredGame");
        expect(result?.args).toEqual({ userId: "6", steamId3: "1:29162964" });
    });

    describe("handler", () => {
        const rawString = '06/22/2025 - 22:33:41: "sonikro<6><[U:1:29162964]><>" entered the game';
        let mockUserBanRepository: any;
        let mockServerRepository: any;
        let mockServerCommander: any;
        let handler: any;
        let command: any;
        const serverId = "test-server";
        const fakeServer = {
            rconAddress: "127.0.0.1",
            rconPassword: "rconpass"
        };

        beforeEach(() => {
            mockUserBanRepository = {
                isUserBanned: vi.fn()
            };
            mockServerRepository = {
                findById: vi.fn()
            };
            mockServerCommander = {
                query: vi.fn()
            };
            command = userEnteredGame(rawString);
            handler = command?.handler;
        });

        it("should ban the user if user is banned", async () => {
            mockUserBanRepository.isUserBanned.mockResolvedValue({ isBanned: true, reason: "Cheating" });
            mockServerRepository.findById.mockResolvedValue(fakeServer);
            await handler({
                args: command.args,
                password: serverId,
                services: {
                    userBanRepository: mockUserBanRepository,
                    serverRepository: mockServerRepository,
                    serverCommander: mockServerCommander
                }
            });
            expect(mockUserBanRepository.isUserBanned).toHaveBeenCalledWith("1:29162964");
            expect(mockServerRepository.findById).toHaveBeenCalledWith(serverId);
            expect(mockServerCommander.query).toHaveBeenCalledWith(expect.objectContaining({
                host: fakeServer.rconAddress,
                port: 27015,
                password: fakeServer.rconPassword,
                command: expect.stringContaining("sm_ban #6 0 Cheating"),
                timeout: 5000
            }));
        });

        it("should not ban user if user is not banned", async () => {
            mockUserBanRepository.isUserBanned.mockResolvedValue({ isBanned: false });
            await handler({
                args: command.args,
                password: serverId,
                services: {
                    userBanRepository: mockUserBanRepository,
                    serverRepository: mockServerRepository,
                    serverCommander: mockServerCommander
                }
            });
            expect(mockUserBanRepository.isUserBanned).toHaveBeenCalledWith("1:29162964");
            expect(mockServerRepository.findById).not.toHaveBeenCalled();
            expect(mockServerCommander.query).not.toHaveBeenCalled();
        });
    });
});
