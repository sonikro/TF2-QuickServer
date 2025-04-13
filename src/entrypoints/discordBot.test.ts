import { Client, CommandInteraction, REST, Routes } from 'discord.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from "vitest-mock-extended";
import { when } from "vitest-when";
import { UserError } from '../core/errors/UserError';
import { KnexConnectionManager } from '../providers/repository/KnexConnectionManager';
import { createCommands } from './commands';
import { startDiscordBot } from "./discordBot";

vi.mock("../providers/repository/KnexConnectionManager", async () => {
    const actual = await import("../providers/repository/KnexConnectionManager") as typeof import('../providers/repository/KnexConnectionManager');
    return {
        ...actual,
        KnexConnectionManager: {
            initialize: vi.fn(),
            client: mock(),
        }
    }
})

vi.mock("./commands", async (importOriginal) => {
    const actual = await importOriginal() as typeof import('./commands');
    // Forces createCommands to always return the same commands so mocks can be used
    const commands = actual.createCommands(({} as any));
    return {
        createCommands: vi.fn().mockReturnValue(commands),
    }
})

vi.mock('discord.js', async (importOriginal) => {
    const actual = await importOriginal() as typeof import('discord.js');
    return {
        ...actual,
        Client: vi.fn(),
        REST: vi.fn(),
    };
})
describe("startDiscordBot", () => {

    const discordCommands = createCommands(mock())

    describe("errors", () => {
        it("should throw an error if DISCORD_TOKEN is not set", async () => {
            process.env.DISCORD_TOKEN = '';
            process.env.DISCORD_CLIENT_ID = 'valid_client_id';

            const act = () => startDiscordBot();

            await expect(act()).rejects.toThrow('DISCORD_TOKEN is not set in the environment variables.');
        })

        it("should throw an error if DISCORD_CLIENT_ID is not set", async () => {
            process.env.DISCORD_TOKEN = 'valid_token';
            process.env.DISCORD_CLIENT_ID = '';

            const act = () => startDiscordBot();

            await expect(act()).rejects.toThrow('DISCORD_CLIENT_ID is not set in the environment variables.');
        })
    })

    describe("initialization", () => {


        const rest = mock<REST>({
            put: vi.fn(),
            setToken: vi.fn().mockReturnThis(),
        });
        vi.mocked(REST).mockImplementation(() => rest);

        const client = mockDeep<Client>()
        vi.mocked(Client).mockImplementation(() => client);

        beforeAll(async () => {
            process.env.DISCORD_TOKEN = 'valid_token';
            process.env.DISCORD_CLIENT_ID = 'valid_client_id';
            await startDiscordBot();
        })

        it("should initialize KnexConnectionManager", () => {
            expect(KnexConnectionManager.initialize).toHaveBeenCalled();
        })
        it("should register all commands globally with Discord API", async () => {
            const expectedCommands = Object.values(discordCommands)
                .map(command => command.definition.toJSON());

            expect(rest.put).toHaveBeenCalledWith(
                Routes.applicationCommands('valid_client_id'),
                expect.objectContaining({
                    body: expectedCommands
                })
            );
        })

        it("should log in to Discord with the provided token", () => {
            expect(client.login).toHaveBeenCalledWith('valid_token');
        })

        it("should set the token for the REST client", () => {
            expect(rest.setToken).toHaveBeenCalledWith('valid_token');
        })

        describe("interaction handlers", () => {
            it.each(Object.values(discordCommands))("should setup a event handler for interactions that redirects to the command handler for $name", (receivedCommand) => {
                client.on.mock.calls[0][0]; // 'interactionCreate'
                const handler = client.on.mock.calls[0][1]; // the handler function
                const interaction = mock<CommandInteraction>()
                when(interaction.isCommand).calledWith().thenReturn(true);
                interaction.commandName = receivedCommand.name

                vi.spyOn(receivedCommand, 'handler').mockImplementation(() => Promise.resolve());
                handler(interaction);

                expect(receivedCommand.handler).toHaveBeenCalledWith(interaction);
            })

            it("should ignore non-command interactions", () => {
                const interaction = mock<CommandInteraction>()
                when(interaction.isCommand).calledWith().thenReturn(false);

                const handler = client.on.mock.calls[0][1]; // the handler function
                handler(interaction);

                expect(interaction.isCommand).toHaveBeenCalled();
            })

            it("should reply with an error message if the command is not found", () => {
                const interaction = mock<CommandInteraction>()
                when(interaction.isCommand).calledWith().thenReturn(true);
                interaction.commandName = 'unknown-command';

                const handler = client.on.mock.calls[0][1]; // the handler function
                handler(interaction);

                expect(interaction.reply).toHaveBeenCalledWith({ content: 'Command not found' });
            })

            it("should reply with an error message if the command handler throws a UserError", async () => {
                const interaction = mock<CommandInteraction>()
                when(interaction.isCommand).calledWith().thenReturn(true);
                interaction.commandName = discordCommands.createServer.name;
                const handler = client.on.mock.calls[0][1]; // the handler function
                const error = new UserError('Test error');

                vi.spyOn(discordCommands.createServer, 'handler').mockRejectedValue(error);

                handler(interaction);

                await new Promise(resolve => setTimeout(resolve, 0)); // wait for the promise to resolve
                expect(interaction.reply).toHaveBeenCalledWith({ content: error.message });
            })

            it.each(Object.values(discordCommands))("should reply with an error message if the command handler for $name throws an error", async (receivedCommand) => {
                const interaction = mock<CommandInteraction>()
                when(interaction.isCommand).calledWith().thenReturn(true);
                interaction.commandName = receivedCommand.name;
                const handler = client.on.mock.calls[0][1]; // the handler function
                const error = new Error('Test error');

                vi.spyOn(receivedCommand, 'handler').mockRejectedValue(error);

                handler(interaction);

                await new Promise(resolve => setTimeout(resolve, 0)); // wait for the promise to resolve
                expect(interaction.reply).toHaveBeenCalledWith({ content: 'There was an error while executing this command!' });
            })
        })

    })

})