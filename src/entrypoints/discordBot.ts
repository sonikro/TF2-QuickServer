import { ChatInputCommandInteraction, Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { ECSCommandExecutor } from "../providers/services/ECSCommandExecutor";
import { ECSServerManager } from "../providers/services/ECSServerManager";
import { KnexConnectionManager } from "../providers/repository/KnexConnectionManager";
import { defaultAwsServiceFactory } from "../providers/services/defaultAwsServiceFactory";
import { defaultConfigManager } from "../providers/utils/DefaultConfigManager";
import { chancePasswordGenerator } from "../providers/utils/chancePasswordGenerator";
import { createCommands } from "./commands";
import { CreateServerForUser } from "../core/usecase/CreateServerForUser";
import { SQLiteServerRepository } from "../providers/repository/SQliteServerRepository";
import { DeleteServerForUser } from "../core/usecase/DeleteServerForUser";
import { scheduleConsumeCreditsRoutine, scheduleServerCleanupRoutine } from "./jobs";
import { TerminateEmptyServers } from "../core/usecase/TerminateEmptyServers";
import { SQliteServerActivityRepository } from "../providers/repository/SQliteServerActivityRepository";
import { RCONServerCommander } from "../providers/services/RCONServerCommander";
import { ConsumeCreditsFromRunningServers } from "../core/usecase/ConsumeCreditsFromRunningServers";
import { SQliteUserCreditsRepository } from "../providers/repository/SQliteUserCreditsRepository";
import { scheduleTerminateServersWithoutCreditRoutine } from "./jobs/TerminateServersWithoutCreditRoutine";
import { TerminateServersWithoutCredit } from "../core/usecase/TerminateServersWithoutCredit";
import { CreateCreditsPurchaseOrder } from "../core/usecase/CreateCreditsPurchaseOrder";
import { PaypalPaymentService } from "../providers/services/PaypalPaymentService";
import { SQliteCreditOrdersRepository } from "../providers/repository/SQliteCreditOrdersRepository";
import { initializeExpress } from "./http/express";
import { HandleOrderPaid } from "../core/usecase/HandleOrderPaid";

export async function startDiscordBot() {

    KnexConnectionManager.initialize();

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
    const serverCommander = new RCONServerCommander()

    const ecsServerManager = new ECSServerManager({
        serverCommander,
        awsServiceFactory: defaultAwsServiceFactory,
        configManager: defaultConfigManager,
        passwordGenerator: chancePasswordGenerator
    })

    const serverRepository = new SQLiteServerRepository({
        knex: KnexConnectionManager.client,
    })
    const serverActivityRepository = new SQliteServerActivityRepository({
        knex: KnexConnectionManager.client,
    })
    const userCreditsRepository = new SQliteUserCreditsRepository({
        knex: KnexConnectionManager.client
    })

    const paymentService = new PaypalPaymentService({
        clientId: process.env.PAYPAL_CLIENT_ID!,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
        sandbox: process.env.PAYPAL_ENV === 'sandbox'
    })

    const creditOrdersRepository = new SQliteCreditOrdersRepository({
        knex: KnexConnectionManager.client
    })
    
    const discordCommands = createCommands({
        createServerForUser: new CreateServerForUser({
            serverManager: ecsServerManager,
            serverRepository,
            userCreditsRepository
        }),
        deleteServerForUser: new DeleteServerForUser({
            serverManager: ecsServerManager,
            serverRepository
        }),
        createCreditsPurchaseOrder: new CreateCreditsPurchaseOrder({
            creditOrdersRepository,
            paymentService
        }),
        userCreditsRepository
    })

    // Schedule jobs
    scheduleServerCleanupRoutine({
        terminateEmptyServers: new TerminateEmptyServers({
            serverManager: ecsServerManager,
            serverRepository,
            serverActivityRepository: serverActivityRepository,
            serverCommander: serverCommander
        })
    })

    scheduleConsumeCreditsRoutine({
        consumeCreditsFromRunningServers: new ConsumeCreditsFromRunningServers({
            serverRepository,
            userCreditsRepository
        })
    })

    scheduleTerminateServersWithoutCreditRoutine({
        terminateServersWithoutCredit: new TerminateServersWithoutCredit({
            serverRepository,
            userCreditsRepository,
            serverManager: ecsServerManager,
            serverCommander
        })
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
            await chatInputInteraction.reply({ content: 'Command not found' });
            return;
        }
        try {
            await command.handler(chatInputInteraction);
        }
        catch (error: Error | any) {
            if (error.name === 'UserError') {
                await chatInputInteraction.reply({
                    content: error.message
                })
            } else {
                console.error(`Error executing command ${commandName}:`, error);
                await chatInputInteraction.reply({ content: 'There was an error while executing this command!' });
            }
        }
    });

    // Login to Discord
    client.login(token);

    // Initialize HTTP Server
    initializeExpress({
        handleOrderPaid: new HandleOrderPaid({
            creditOrdersRepository,
            userCreditsRepository
        }),
        paypalService: paymentService,
    })

    return client;
}
