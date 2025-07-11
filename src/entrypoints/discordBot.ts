import { ChatInputCommandInteraction, Client, GatewayIntentBits, MessageFlags, REST, Routes } from "discord.js";
import { ConsumeCreditsFromRunningServers } from "../core/usecase/ConsumeCreditsFromRunningServers";
import { CreateCreditsPurchaseOrder } from "../core/usecase/CreateCreditsPurchaseOrder";
import { CreateServerForUser } from "../core/usecase/CreateServerForUser";
import { DeleteServerForUser } from "../core/usecase/DeleteServerForUser";
import { SetUserData } from "../core/usecase/SetUserData";
import { TerminateEmptyServers } from "../core/usecase/TerminateEmptyServers";
import { TerminateLongRunningServers } from "../core/usecase/TerminateLongRunningServers";
import { TerminatePendingServers } from "../core/usecase/TerminatePendingServers";
import { TerminateServersWithoutCredit } from "../core/usecase/TerminateServersWithoutCredit";
import { CsvUserBanRepository } from "../providers/repository/CsvUserBanRepository";
import { KnexConnectionManager } from "../providers/repository/KnexConnectionManager";
import { SQliteCreditOrdersRepository } from "../providers/repository/SQliteCreditOrdersRepository";
import { SQliteGuildParametersRepository } from "../providers/repository/SQliteGuildParametersRepository";
import { SQliteServerActivityRepository } from "../providers/repository/SQliteServerActivityRepository";
import { SQLiteServerRepository } from "../providers/repository/SQliteServerRepository";
import { SQliteUserCreditsRepository } from "../providers/repository/SQliteUserCreditsRepository";
import { SQliteUserRepository } from "../providers/repository/SQliteUserRepository";
import { AdyenPaymentService } from "../providers/services/AdyenPaymentService";
import { defaultGracefulShutdownManager, ShutdownInProgressError } from "../providers/services/DefaultGracefulShutdownManager";
import { DefaultServerAbortManager } from "../providers/services/DefaultServerAbortManager";
import { DiscordEventLogger } from "../providers/services/DiscordEventLogger";
import { FileSystemOCICredentialsFactory } from "../providers/services/FileSystemOCICredentialsFactory";
import { OCIServerManager } from "../providers/services/OCIServerManager";
import { PaypalPaymentService } from "../providers/services/PaypalPaymentService";
import { RCONServerCommander } from "../providers/services/RCONServerCommander";
import { defaultOracleServiceFactory } from "../providers/services/defaultOracleServiceFactory";
import { defaultConfigManager } from "../providers/utils/DefaultConfigManager";
import { chancePasswordGenerator } from "../providers/utils/chancePasswordGenerator";
import { createCommands } from "./commands";
import { scheduleConsumeCreditsRoutine, schedulePendingServerCleanupRoutine, scheduleServerCleanupRoutine, scheduleTerminateLongRunningServerRoutine } from "./jobs";
import { scheduleTerminateServersWithoutCreditRoutine } from "./jobs/TerminateServersWithoutCreditRoutine";
import { startSrcdsCommandListener } from "./udp/srcdsCommandListener";

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

    const eventLogger = new DiscordEventLogger({
        discordClient: client,
        configManager: defaultConfigManager,
    })

    const serverAbortManager = new DefaultServerAbortManager();

    const ociServerManager = new OCIServerManager({
        serverCommander,
        ociClientFactory: defaultOracleServiceFactory,
        configManager: defaultConfigManager,
        passwordGenerator: chancePasswordGenerator,
        serverAbortManager,
        ociCredentialsFactory: FileSystemOCICredentialsFactory
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
    const userRepository = new SQliteUserRepository({
        knex: KnexConnectionManager.client
    })

    const paypalPaymentService = new PaypalPaymentService({
        clientId: process.env.PAYPAL_CLIENT_ID!,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
        sandbox: process.env.PAYPAL_ENV === 'sandbox'
    })

    const adyenPaymentService = new AdyenPaymentService({
        apiKey: process.env.ADYEN_API_KEY!,
        environment: process.env.ADYEN_ENV! as 'live' | 'test',
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
        hmacKey: process.env.ADYEN_HMAC_KEY!
    })

    const creditOrdersRepository = new SQliteCreditOrdersRepository({
        knex: KnexConnectionManager.client
    })

    const guildParametersRepository = new SQliteGuildParametersRepository({
        knex: KnexConnectionManager.client
    })

    const userBanRepository = new CsvUserBanRepository()

    const discordCommands = createCommands({
        createServerForUser: new CreateServerForUser({
            serverManager: ociServerManager,
            serverRepository,
            userCreditsRepository,
            eventLogger,
            configManager: defaultConfigManager,
            userRepository,
            guildParametersRepository,
            userBanRepository
        }),
        deleteServerForUser: new DeleteServerForUser({
            serverManager: ociServerManager,
            serverRepository,
            eventLogger,
            serverAbortManager
        }),
        createCreditsPurchaseOrder: new CreateCreditsPurchaseOrder({
            creditOrdersRepository,
            paymentService: adyenPaymentService,
            eventLogger
        }),
        setUserData: new SetUserData({
            userRepository
        }),
        userCreditsRepository,
        configManager: defaultConfigManager
    })

    // Schedule jobs
    scheduleServerCleanupRoutine({
        terminateEmptyServers: new TerminateEmptyServers({
            serverManager: ociServerManager,
            serverRepository,
            serverActivityRepository: serverActivityRepository,
            serverCommander: serverCommander,
            eventLogger,
            configManager: defaultConfigManager,
            discordBot: client
        }),
        eventLogger
    })

    scheduleConsumeCreditsRoutine({
        consumeCreditsFromRunningServers: new ConsumeCreditsFromRunningServers({
            serverRepository,
            userCreditsRepository,
        }),
        configManager: defaultConfigManager,
        eventLogger
    })

    scheduleTerminateServersWithoutCreditRoutine({
        terminateServersWithoutCredit: new TerminateServersWithoutCredit({
            serverRepository,
            userCreditsRepository,
            serverManager: ociServerManager,
            serverCommander,
            eventLogger
        }),
        configManager: defaultConfigManager,
        eventLogger
    })

    schedulePendingServerCleanupRoutine({
        terminatePendingServers: new TerminatePendingServers({
            serverManager: ociServerManager,
            serverRepository,
            eventLogger,
            discordBot: client
        }),
        eventLogger
    })

    scheduleTerminateLongRunningServerRoutine({
        terminateLongRunningServers: new TerminateLongRunningServers({
            serverRepository,
            serverManager: ociServerManager,
            serverCommander,
            eventLogger
        }),
        eventLogger
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
            await eventLogger.log({
                eventMessage: `User executed command ${commandName}`,
                actorId: chatInputInteraction.user.id,
            })
            await defaultGracefulShutdownManager.run(() => command.handler(chatInputInteraction))
        }
        catch (error: Error | any) {
            console.error(`Error executing command ${commandName}:`, error);
            // If error is a ShutdownInProgressError, reply to the user
            if (error instanceof ShutdownInProgressError) {
                await chatInputInteraction.reply({
                    content: 'The server is currently in maintenance mode. Please try again later in a few minutes.',
                    flags: MessageFlags.Ephemeral
                });
            }
            await eventLogger.log({
                eventMessage: `Error executing command ${commandName}: ${error.message}`,
                actorId: chatInputInteraction.user.id,
            });
        }
    });

    // Login to Discord
    client.login(token);

    // Start UDP log listener with dependency injection
    startSrcdsCommandListener({
        serverCommander,
        userBanRepository,
        serverRepository,
        serverManager: ociServerManager,
        userRepository,
        eventLogger
    });


    // Prevent crashes and log global errors
    process.on('unhandledRejection', (error: Error | any) => {
        console.error('Unhandled promise rejection:', error);
        eventLogger.log({
            eventMessage: `Unhandled promise rejection: ${error.message}`,
            actorId: 'system',
        })
    });
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        eventLogger.log({
            eventMessage: `Uncaught exception: ${error.message}`,
            actorId: 'system',
        })
    })

    process.on("SIGTERM", async () => {
        await defaultGracefulShutdownManager.onShutdownWait();
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        await defaultGracefulShutdownManager.onShutdownWait();
        process.exit(0);
    })

    return client;
}
