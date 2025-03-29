import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { createServerCommandDefinition, createServerCommandHandler } from "./CreateServer";
import { terminateServerCommandDefinition, terminateServerCommandHandler } from "./TerminateServer";


export default {
    createServer: {
        name: "create-server",
        definition: createServerCommandDefinition,
        handler: createServerCommandHandler,
    },
    terminateServer: {
        name: "terminate-server",
        definition: terminateServerCommandDefinition,
        handler: terminateServerCommandHandler,
    },
} satisfies Record<string, {
    name: string;
    definition: SlashCommandOptionsOnlyBuilder,
    handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
}>
