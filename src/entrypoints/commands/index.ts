import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { ServerManager } from "../../core/services/ServerManager";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";

export type CommandDependencies = {
    serverManager: ServerManager;
}

export function createCommands(dependencies: CommandDependencies) {
    return {
        createServer: {
            name: "create-server",
            definition: createServerCommandDefinition,
            handler: createServerCommandHandlerFactory(dependencies),
        },
        terminateServer: {
            name: "terminate-server",
            definition: terminateServerCommandDefinition,
            handler: terminateServerHandlerFactory(dependencies),
        },
    } satisfies Record<string, {
        name: string;
        definition: SlashCommandOptionsOnlyBuilder,
        handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }>
}
