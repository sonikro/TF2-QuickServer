import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { UserCreditsRepository } from "../../core/repository/UserCreditsRepository";
import { CreateCreditsPurchaseOrder } from "../../core/usecase/CreateCreditsPurchaseOrder";
import { CreateServerForUser } from "../../core/usecase/CreateServerForUser";
import { GetServerStatus } from "../../core/usecase/GetServerStatus";
import { BackgroundTaskQueue } from "../../core/services/BackgroundTaskQueue";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { getBalanceCommandDefinition } from "./GetBalance/definition";
import { createGetBalanceCommandHandlerFactory } from "./GetBalance/handler";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { setUserDataDefinition, setUserDataHandlerFactory } from "./SetUserData";
import { SetUserData } from "../../core/usecase/SetUserData";
import { statusCommandDefinition, createStatusCommandHandlerFactory } from "./Status";

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    userCreditsRepository: UserCreditsRepository;
    createCreditsPurchaseOrder: CreateCreditsPurchaseOrder;
    configManager: ConfigManager;
    setUserData: SetUserData;
    backgroundTaskQueue: BackgroundTaskQueue;
    getServerStatus: GetServerStatus;
}

export function createCommands(dependencies: CommandDependencies) {
    return {
        createServer: {
            name: "create-server",
            definition: createServerCommandDefinition,
            handler: createServerCommandHandlerFactory({
                createServerForUser: dependencies.createServerForUser,
                backgroundTaskQueue: dependencies.backgroundTaskQueue,
            }),
        },
        terminateServer: {
            name: "terminate-servers",
            definition: terminateServerCommandDefinition,
            handler: terminateServerHandlerFactory({
                backgroundTaskQueue: dependencies.backgroundTaskQueue,
            }),
        },
        setUserData: {
            name: "set-user-data",
            definition: setUserDataDefinition,
            handler: setUserDataHandlerFactory({
                setUserData: dependencies.setUserData,
            })
        },
        status: {
            name: "status",
            definition: statusCommandDefinition,
            handler: createStatusCommandHandlerFactory({
                getServerStatus: dependencies.getServerStatus,
            })
        },
        ...(dependencies.configManager.getCreditsConfig().enabled ? {
            getBalance: {
                name: "get-balance",
                definition: getBalanceCommandDefinition,
                handler: createGetBalanceCommandHandlerFactory({
                    userCreditsRepository: dependencies.userCreditsRepository,
                }),
            }
        } : undefined)

        // TODO: Uncomment when the Pricing Packages are ready
        // buyCredit: {
        //     name: "buy-credits",
        //     definition: buyCreditsCommandDefinition,
        //     handler: createBuyCreditsCommandHandlerFactory({
        //         createCreditsPurchaseOrder: dependencies.createCreditsPurchaseOrder,
        //     })
        // }
    } satisfies Record<string, {
        name: string;
        definition: SlashCommandOptionsOnlyBuilder,
        handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }>
}
