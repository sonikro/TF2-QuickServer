import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { UserCreditsRepository } from "@tf2qs/core";
import { CreateCreditsPurchaseOrder } from "@tf2qs/core";
import { CreateServerForUser } from "@tf2qs/core";
import { GetServerStatus } from "@tf2qs/core";
import { GetUserServers } from "@tf2qs/core";
import { BackgroundTaskQueue } from "@tf2qs/core";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { getBalanceCommandDefinition } from "./GetBalance/definition";
import { createGetBalanceCommandHandlerFactory } from "./GetBalance/handler";
import { getMyServersCommandDefinition, getMyServersCommandHandlerFactory } from "./GetMyServers";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";
import { ConfigManager } from "@tf2qs/core";
import { setUserDataDefinition, setUserDataHandlerFactory } from "./SetUserData";
import { SetUserData } from "@tf2qs/core";
import { statusCommandDefinition, createStatusCommandHandlerFactory } from "./Status";
import { getPlayerConnectionHistoryDefinition, getPlayerConnectionHistoryHandlerFactory } from "./GetPlayerConnectionHistory";

export type Command = {
    name: string;
    definition: SlashCommandOptionsOnlyBuilder;
    handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    ownerOnly?: boolean;
}

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    userCreditsRepository: UserCreditsRepository;
    createCreditsPurchaseOrder: CreateCreditsPurchaseOrder;
    configManager: ConfigManager;
    setUserData: SetUserData;
    backgroundTaskQueue: BackgroundTaskQueue;
    getServerStatus: GetServerStatus;
    getUserServers: GetUserServers;
}

export function createCommands(dependencies: CommandDependencies): Record<string, Command> {
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
            }),
        },
        getPlayerConnectionHistory: {
            name: "get-player-connection-history",
            definition: getPlayerConnectionHistoryDefinition,
            handler: getPlayerConnectionHistoryHandlerFactory(),
            ownerOnly: true,
        },
        status: {
            name: "status",
            definition: statusCommandDefinition,
            handler: createStatusCommandHandlerFactory({
                getServerStatus: dependencies.getServerStatus,
            })
        },
        getMyServers: {
            name: "get-my-servers",
            definition: getMyServersCommandDefinition,
            handler: getMyServersCommandHandlerFactory({
                getUserServers: dependencies.getUserServers,
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
    };
}
