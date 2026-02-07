import { ServerRepository } from "@tf2qs/core";
import { UserBanRepository } from "@tf2qs/core";
import { UserRepository } from "@tf2qs/core";
import { EventLogger } from "@tf2qs/core";
import { ServerCommander } from "@tf2qs/core";
import { BackgroundTaskQueue } from "@tf2qs/core";
import { PlayerConnectionHistoryRepository } from "@tf2qs/core";
import { ServerStatusMetricsRepository } from "@tf2qs/core";

/**
 * List of services available to UDP Command Handlers
 */
export type UDPCommandsServices = {
    serverCommander: ServerCommander;
    userBanRepository: UserBanRepository;
    serverRepository: ServerRepository;
    userRepository: UserRepository
    eventLogger: EventLogger;
    backgroundTaskQueue: BackgroundTaskQueue;
    playerConnectionHistoryRepository: PlayerConnectionHistoryRepository;
    serverStatusMetricsRepository: ServerStatusMetricsRepository;
}
