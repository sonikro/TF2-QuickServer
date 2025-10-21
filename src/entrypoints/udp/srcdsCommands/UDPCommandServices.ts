import { ServerRepository } from "../../../core/repository/ServerRepository";
import { UserBanRepository } from "../../../core/repository/UserBanRepository";
import { UserRepository } from "../../../core/repository/UserRepository";
import { EventLogger } from "../../../core/services/EventLogger";
import { ServerCommander } from "../../../core/services/ServerCommander";
import { BackgroundTaskQueue } from "../../../core/services/BackgroundTaskQueue";

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
