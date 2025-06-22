import { ServerRepository } from "../../../core/repository/ServerRepository";
import { UserBanRepository } from "../../../core/repository/UserBanRepository";
import { ServerCommander } from "../../../core/services/ServerCommander";

/**
 * List of services available to UDP Command Handlers
 */
export type UDPCommandsServices = {
    serverCommander: ServerCommander;
    userBanRepository: UserBanRepository;
    serverRepository: ServerRepository;
}
