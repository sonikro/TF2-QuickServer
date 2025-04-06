import { describe, it, expect } from "vitest";
import { ServerStatus } from "./ServerStatus";

describe("ServerStatus", () => {

    const serverStatusString = `hostname: TF2-QuickServer | Virginia @ Sonikro Solutions
version : 9543365/24 9543365 secure
udp/ip  : 169.254.173.35:13768  (local: 0.0.0.0:27015)  (public IP from Steam: 44.200.128.3)
steamid : [A:1:1871475725:44792] (90264374594008077)
account : not logged in  (No account specified)
map     : cp_badlands at: 0 x, 0 y, 0 z
tags    : cp
sourcetv:  169.254.173.35:13769, delay 30.0s  (local: 0.0.0.0:27020)
players : 1 humans, 1 bots (25 max)
edicts  : 426 used of 2048 max
# userid name                uniqueid            connected ping loss state  adr
#      2 "TF2-QuickServer TV | Virginia @" BOT                       active
#      3 "sonikro"           [U:1:29162964]      00:20       60    0 active 169.254.249.16:18930
`

    const sut = new ServerStatus(serverStatusString);

    it("should parse server IP and port", () => {
        expect(sut.serverIp).toBe("169.254.173.35")
        expect(sut.serverPort).toBe(13768)
    })

    it("should parse source TV IP and port", () => {
        expect(sut.sourceTVIp).toBe("169.254.173.35")
        expect(sut.sourceTVPort).toBe(13769)
    })

    it("should parse number of players", () => {
        expect(sut.numberOfPlayers).toBe(1)
    })
})