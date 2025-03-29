import { ChatInputCommandInteraction, Client, CommandInteraction, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Initialize the client with necessary intents
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Define the bot token
const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('create-server')
        .setDescription('Deploys a new TF2 server in the selected region with a specific variant')
        .addStringOption(option =>
            option.setName('region')
                .setDescription('Region to deploy the server')
                .addChoices([
                    { name: "US - N. Virginia", value: "us-east-1" },
                    { name: "US - Ohio", value: "us-east-2" },
                    { name: "US - N. California", value: "us-west-1" },
                    { name: "US - Oregon", value: "us-west-2" },
                    { name: "CA - Central", value: "ca-central-1" },
                    { name: "CA - Calgary", value: "ca-west-1" },
                    { name: "CN - Beijing ", value: "cn-north-1" },
                    { name: "EU - Frankfurt", value: "eu-central-1" },
                    { name: "EU - Zurich", value: "eu-central-2" },
                    { name: "EU - Ireland", value: "eu-west-1" },
                    { name: "EU - London", value: "eu-west-2" },
                    { name: "EU - Paris", value: "eu-west-3" },
                    { name: "EU - Milan", value: "eu-south-1" },
                    { name: "EU - Spain", value: "eu-south-2" },
                    { name: "EU - Stockholm", value: "eu-north-1" },
                    { name: "AP - Hong Kong", value: "ap-east-1" },
                    { name: "AP - Mumbai", value: "ap-south-1" },
                    { name: "AP - Tokyo", value: "ap-northeast-1" },
                    { name: "AP - Seoul", value: "ap-northeast-2" },
                    { name: "AP - Osaka", value: "ap-northeast-3" },
                    { name: "AP - Singapore", value: "ap-southeast-1" },
                    { name: "AP - Sydney", value: "ap-southeast-2" },
                    { name: "AP - Melbourne", value: "ap-southeast-4" },
                    { name: "SA - São Paulo", value: "sa-east-1" },
                    { name: "AF - Cape Town", value: "af-south-1" }
                ])
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('variant_name')
                .setDescription('Variant of the TF2 server (6v6, 9v9, etc.)')
                .addChoices([
                    { name: "Standard Competitive", value: "standard-competitive" }
                ])
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('terminate-server')
        .setDescription('Shuts down a specified TF2 server')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('ID of the server to terminate')
                .setRequired(true)
        )
];

// Register commands with Discord API
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Register commands globally (this applies to all guilds)
        await rest.put(Routes.applicationCommands(clientId), {
            body: commands.map(command => command.toJSON()), // Convert CommandBuilder to JSON
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Bot login
client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
});

// Handling commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const chatInputInteraction = interaction as ChatInputCommandInteraction;
    const { commandName } = chatInputInteraction;

    if (commandName === 'create-server') {
        const region = chatInputInteraction.options.getString('region');
        const variantName = chatInputInteraction.options.getString('variant_name');

        // Logic for deploying server
        await chatInputInteraction.reply(`Server created in region ${region} with the variant ${variantName}`);
    } else if (commandName === 'terminate-server') {
        const serverId = chatInputInteraction.options.getString('server_id');

        // Logic for terminating server
        await chatInputInteraction.reply(`Server with ID ${serverId} has been terminated.`);
    }
});

// Login to Discord
client.login(token);