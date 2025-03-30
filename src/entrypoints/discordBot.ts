import { ChatInputCommandInteraction, Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { ECSServerManager } from "../infrastructure/ECSServerManager";
import { createCommands } from "./commands";

export async function startDiscordBot() {

    // Initialize the client with necessary intents
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });

    // Define the bot token
    const token = process.env.DISCORD_TOKEN!;
    const clientId = process.env.DISCORD_CLIENT_ID!;

    // Check if token and clientId are available
    if (!token) {
        throw new Error('DISCORD_TOKEN is not set in the environment variables.');
    }
    if (!clientId) {
        throw new Error('DISCORD_CLIENT_ID is not set in the environment variables.');
    }

    // Initialize Bot Dependencies
    const discordCommands = createCommands({
        serverManager: new ECSServerManager()
    })

    // Slash commands
    const commands = Object.values(discordCommands).map(command => command.definition)

    // Register commands with Discord API
    const rest = new REST({ version: '10' }).setToken(token);

    console.log('Started refreshing application (/) commands.');

    // Register commands globally (this applies to all guilds)
    await rest.put(Routes.applicationCommands(clientId), {
        body: commands.map(command => command.toJSON()), // Convert CommandBuilder to JSON
    });

    console.log('Successfully reloaded application (/) commands.');

    // Bot login
    client.once('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);
    });

    // Handling commands
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const chatInputInteraction = interaction as ChatInputCommandInteraction;
        const { commandName } = chatInputInteraction;

        // Check if the command exists in the DiscordCommands object
        const command = Object.values(discordCommands).find(cmd => cmd.name === commandName);
        if (!command) {
            await chatInputInteraction.reply({ content: 'Command not found'});
            return;
        }
        try {
            await command.handler(chatInputInteraction);
        }
        catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            await chatInputInteraction.reply({ content: 'There was an error while executing this command!' });
        }
    });

    // Login to Discord
    client.login(token);

    return client;
}
