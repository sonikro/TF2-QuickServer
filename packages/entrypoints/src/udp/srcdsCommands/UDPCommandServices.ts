import { ServerRepository } from "@tf2qs/core/src/repository/ServerRepository";
import { UserBanRepository } from "@tf2qs/core/src/repository/UserBanRepository";
import { UserRepository } from "@tf2qs/core/src/repository/UserRepository";
import { EventLogger } from "@tf2qs/core/src/services/EventLogger";
import { ServerCommander } from "@tf2qs/core/src/services/ServerCommander";
import { BackgroundTaskQueue } from "@tf2qs/core/src/services/BackgroundTaskQueue";

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
}
