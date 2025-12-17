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
import { createVariantCommandDefinition, createVariantCommandHandlerFactory } from "./CreateVariant";
import { deleteVariantCommandDefinition, deleteVariantCommandHandlerFactory } from "./DeleteVariant";
import { CreateVariant, DeleteVariant, VariantRepository } from "@tf2qs/core";

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    userCreditsRepository: UserCreditsRepository;
    createCreditsPurchaseOrder: CreateCreditsPurchaseOrder;
    configManager: ConfigManager;
    setUserData: SetUserData;
    backgroundTaskQueue: BackgroundTaskQueue;
    getServerStatus: GetServerStatus;
    getUserServers: GetUserServers;
    createVariant: CreateVariant;
    deleteVariant: DeleteVariant;
    variantRepository: VariantRepository;
}

export function createCommands(dependencies: CommandDependencies) {
    return {
        createServer: {
            name: "create-server",
            definition: createServerCommandDefinition,
            handler: createServerCommandHandlerFactory({
                createServerForUser: dependencies.createServerForUser,
                backgroundTaskQueue: dependencies.backgroundTaskQueue,
                variantRepository: dependencies.variantRepository,
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
        getMyServers: {
            name: "get-my-servers",
            definition: getMyServersCommandDefinition,
            handler: getMyServersCommandHandlerFactory({
                getUserServers: dependencies.getUserServers,
            })
        },
        createVariant: {
            name: "create-variant",
            definition: createVariantCommandDefinition,
            handler: createVariantCommandHandlerFactory({
                createVariant: dependencies.createVariant,
            })
        },
        deleteVariant: {
            name: "delete-variant",
            definition: deleteVariantCommandDefinition,
            handler: deleteVariantCommandHandlerFactory({
                deleteVariant: dependencies.deleteVariant,
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
