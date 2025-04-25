import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { UserCreditsRepository } from "../../core/repository/UserCreditsRepository";
import { CreateCreditsPurchaseOrder } from "../../core/usecase/CreateCreditsPurchaseOrder";
import { CreateServerForUser } from "../../core/usecase/CreateServerForUser";
import { DeleteServerForUser } from "../../core/usecase/DeleteServerForUser";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { getBalanceCommandDefinition } from "./GetBalance/definition";
import { createGetBalanceCommandHandlerFactory } from "./GetBalance/handler";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";
import { ConfigManager } from "../../core/utils/ConfigManager";

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    deleteServerForUser: DeleteServerForUser;
    userCreditsRepository: UserCreditsRepository;
    createCreditsPurchaseOrder: CreateCreditsPurchaseOrder;
    configManager: ConfigManager;
}

export function createCommands(dependencies: CommandDependencies) {
    return {
        createServer: {
            name: "create-server",
            definition: createServerCommandDefinition,
            handler: createServerCommandHandlerFactory({
                createServerForUser: dependencies.createServerForUser,
            }),
        },
        terminateServer: {
            name: "terminate-server",
            definition: terminateServerCommandDefinition,
            handler: terminateServerHandlerFactory({
                deleteServerForUser: dependencies.deleteServerForUser,
            }),
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
