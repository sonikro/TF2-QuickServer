import { Chance } from "chance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region, Server } from "../domain";
import { ServerRepository } from "../repository/ServerRepository";
import { ServerStatusMetricsRepository } from "../repository/ServerStatusMetricsRepository";
import { ServerCommander } from "../services/ServerCommander";
import { CollectServerMetrics } from "./CollectServerMetrics";

const chance = new Chance();

const createServerStatusString = (params: { map: string }) => `hostname: TF2-QuickServer | Virginia
version : 9543365/24 9543365 secure
udp/ip  : 169.254.173.35:13768  (local: 0.0.0.0:27015)  (public IP from Steam: 44.200.128.3)
steamid : [A:1:1871475725:44792] (90264374594008077)
account : not logged in  (No account specified)
map     : ${params.map} at: 0 x, 0 y, 0 z
tags    : cp
sourcetv:  169.254.173.35:13769, delay 30.0s  (local: 0.0.0.0:27020)
players : 1 humans, 1 bots (25 max)
edicts  : 426 used of 2048 max
# userid name                uniqueid            connected ping loss state  adr
#      2 "TF2-QuickServer TV | Virginia @" BOT                       active
#      3 "sonikro"           [U:1:29162964]      00:20       60    0 active 169.254.249.16:18930
`;

const createServer = (): Server => ({
    hostIp: chance.ip(),
    hostPort: chance.integer({ min: 1000, max: 65535 }),
    serverId: chance.guid(),
    region: chance.pickone(Object.values(Region)),
    variant: "standard-competitive",
    rconPassword: chance.word(),
    rconAddress: chance.ip(),
    tvIp: chance.ip(),
    tvPort: chance.integer({ min: 1000, max: 65535 }),
    createdBy: chance.guid(),
});

const makeSut = () => {
    const serverRepository = mock<ServerRepository>();
    const serverStatusMetricsRepository = mock<ServerStatusMetricsRepository>();
    const serverCommander = mock<ServerCommander>();

    const sut = new CollectServerMetrics({
        serverRepository,
        serverStatusMetricsRepository,
        serverCommander,
    });

    return {
        sut,
        serverRepository,
        serverStatusMetricsRepository,
        serverCommander,
    };
};

describe("CollectServerMetrics", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-26T00:00:00Z"));
    });

    it("should collect metrics from all running servers", async () => {
        // Given
        const { sut, serverRepository, serverStatusMetricsRepository, serverCommander } = makeSut();
        const server1 = createServer();
        const server2 = createServer();

        when(serverRepository.getAllServers).calledWith("ready").thenResolve([server1, server2]);

        when(serverCommander.query)
            .calledWith(expect.objectContaining({ host: server1.rconAddress }))
            .thenResolve(createServerStatusString({ map: "cp_badlands" }));

        when(serverCommander.query)
            .calledWith(expect.objectContaining({ host: server2.rconAddress }))
            .thenResolve(createServerStatusString({ map: "cp_process_f12" }));

        // When
        await sut.execute();

        // Then
        expect(serverStatusMetricsRepository.save).toHaveBeenCalledWith({
            metric: {
                serverId: server1.serverId,
                map: "cp_badlands",
                timestamp: new Date("2026-01-26T00:00:00Z"),
            },
        });
        expect(serverStatusMetricsRepository.save).toHaveBeenCalledWith({
            metric: {
                serverId: server2.serverId,
                map: "cp_process_f12",
                timestamp: new Date("2026-01-26T00:00:00Z"),
            },
        });
    });

    it("should continue collecting metrics when a server fails to respond", async () => {
        // Given
        const { sut, serverRepository, serverStatusMetricsRepository, serverCommander } = makeSut();
        const server1 = createServer();
        const server2 = createServer();

        when(serverRepository.getAllServers).calledWith("ready").thenResolve([server1, server2]);

        when(serverCommander.query)
            .calledWith(expect.objectContaining({ host: server1.rconAddress }))
            .thenReject(new Error("Connection timeout"));

        when(serverCommander.query)
            .calledWith(expect.objectContaining({ host: server2.rconAddress }))
            .thenResolve(createServerStatusString({ map: "cp_process_f12" }));

        // When
        await sut.execute();

        // Then
        expect(serverStatusMetricsRepository.save).toHaveBeenCalledTimes(1);
        expect(serverStatusMetricsRepository.save).toHaveBeenCalledWith({
            metric: {
                serverId: server2.serverId,
                map: "cp_process_f12",
                timestamp: new Date("2026-01-26T00:00:00Z"),
            },
        });
    });

    it("should not save metrics when no servers are running", async () => {
        // Given
        const { sut, serverRepository, serverStatusMetricsRepository } = makeSut();

        when(serverRepository.getAllServers).calledWith("ready").thenResolve([]);

        // When
        await sut.execute();

        // Then
        expect(serverStatusMetricsRepository.save).not.toHaveBeenCalled();
    });
});
