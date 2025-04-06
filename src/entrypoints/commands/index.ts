import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { CreateServerForUser } from "../../core/usecase/CreateServerForUser";
import { DeleteServerForUser } from "../../core/usecase/DeleteServerForUser";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    deleteServerForUser: DeleteServerForUser;
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
    } satisfies Record<string, {
        name: string;
        definition: SlashCommandOptionsOnlyBuilder,
        handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }>
}
