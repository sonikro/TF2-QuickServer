import { ServerRepository } from "../../../core/repository/ServerRepository";
import { UserBanRepository } from "../../../core/repository/UserBanRepository";
import { UserRepository } from "../../../core/repository/UserRepository";
import { ServerCommander } from "../../../core/services/ServerCommander";
import { ServerManager } from "../../../core/services/ServerManager";

/**
 * List of services available to UDP Command Handlers
 */
export type UDPCommandsServices = {
    serverCommander: ServerCommander;
    userBanRepository: UserBanRepository;
    serverRepository: ServerRepository;
    serverManager: ServerManager;
    userRepository: UserRepository
}
