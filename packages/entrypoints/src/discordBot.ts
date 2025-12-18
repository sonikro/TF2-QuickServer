import { ChatInputCommandInteraction, Client, GatewayIntentBits, MessageFlags, REST, Routes } from "discord.js";
import { ConsumeCreditsFromRunningServers } from "@tf2qs/core";
import { CreateCreditsPurchaseOrder } from "@tf2qs/core";
import { CreateServerForUser } from "@tf2qs/core";
import { DeleteServer } from "@tf2qs/core";
import { DeleteServerForUser } from "@tf2qs/core";
import { GenerateMonthlyUsageReport } from "@tf2qs/core";
import { GetServerStatus } from "@tf2qs/core";
import { GetUserServers } from "@tf2qs/core";
import { SetUserData } from "@tf2qs/core";
import { TerminateEmptyServers } from "@tf2qs/core";
import { TerminateLongRunningServers } from "@tf2qs/core";
import { TerminatePendingServers } from "@tf2qs/core";
import { TerminateServersWithoutCredit } from "@tf2qs/core";
import { AWSCostProvider } from "@tf2qs/providers";
import { OracleCostProvider } from "@tf2qs/providers";
import { DefaultCostProvider } from "@tf2qs/providers";
import { createDeleteServerForUserTaskProcessor } from "@tf2qs/providers";
import { createDeleteServerTaskProcessor } from "@tf2qs/providers";
import { InMemoryBackgroundTaskQueue } from "@tf2qs/providers";
import { CsvUserBanRepository } from "@tf2qs/providers";
import { KnexConnectionManager } from "@tf2qs/providers";
import { SQliteCreditOrdersRepository } from "@tf2qs/providers";
import { SQliteGuildParametersRepository } from "@tf2qs/providers";
import { SQLiteReportRepository } from "@tf2qs/providers";
import { SQliteServerActivityRepository } from "@tf2qs/providers";
import { SQLiteServerRepository } from "@tf2qs/providers";
import { SQliteUserCreditsRepository } from "@tf2qs/providers";
import { SQliteUserRepository } from "@tf2qs/providers";
import { AdyenPaymentService } from "@tf2qs/providers";
import { ChancePasswordGeneratorService } from "@tf2qs/providers";
import { defaultAWSServiceFactory } from "@tf2qs/providers";
import { defaultGracefulShutdownManager, ShutdownInProgressError } from "@tf2qs/providers";
import { defaultOracleServiceFactory } from "@tf2qs/providers";
import { DefaultServerAbortManager } from "@tf2qs/providers";
import { DiscordEventLogger } from "@tf2qs/providers";
import { FileSystemOCICredentialsFactory } from "@tf2qs/providers";
import { PaypalPaymentService } from "@tf2qs/providers";
import { RCONServerCommander } from "@tf2qs/providers";
import { DefaultServerManagerFactory } from "@tf2qs/providers";
import { defaultConfigManager } from "@tf2qs/providers";
import { logger } from "@tf2qs/telemetry";
import { createCommands } from "./commands";
import { initializeExpress } from "./http/express";
import { scheduleConsumeCreditsRoutine, scheduleMonthlyUsageReportRoutine, schedulePendingServerCleanupRoutine, scheduleServerCleanupRoutine, scheduleTerminateLongRunningServerRoutine } from "./jobs";
import { scheduleTerminateServersWithoutCreditRoutine } from "./jobs/TerminateServersWithoutCreditRoutine";
import { startSrcdsCommandListener } from "./udp/srcdsCommandListener";

export async function startDiscordBot() {

    KnexConnectionManager.initialize();

    // Initialize the client with necessary intents
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
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

    const passwordGeneratorService = new ChancePasswordGeneratorService();

    const serverManagerFactory = new DefaultServerManagerFactory({
        serverCommander,
        configManager: defaultConfigManager,
        passwordGeneratorService: passwordGeneratorService,
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

    const backgroundTaskQueue = new InMemoryBackgroundTaskQueue(defaultGracefulShutdownManager);
    const deleteServerUseCase = new DeleteServerForUser({
        serverManagerFactory: serverManagerFactory,
        serverRepository,
        serverActivityRepository,
        eventLogger,
        serverAbortManager
    });

    const deleteServerTaskUseCase = new DeleteServer({
        serverRepository,
        serverActivityRepository,
        serverManagerFactory,
        eventLogger,
        serverAbortManager
    });

    backgroundTaskQueue.registerProcessor(
        'delete-server-for-user',
        createDeleteServerForUserTaskProcessor(deleteServerUseCase)
    );

    backgroundTaskQueue.registerProcessor(
        'delete-server',
        createDeleteServerTaskProcessor(deleteServerTaskUseCase)
    );

    const discordCommands = createCommands({
        createServerForUser: new CreateServerForUser({
            serverManagerFactory: serverManagerFactory,
            serverRepository,
            userCreditsRepository,
            eventLogger,
            configManager: defaultConfigManager,
            userRepository,
            guildParametersRepository,
            userBanRepository
        }),
        createCreditsPurchaseOrder: new CreateCreditsPurchaseOrder({
            creditOrdersRepository,
            paymentService: adyenPaymentService,
            eventLogger
        }),
        setUserData: new SetUserData({
            userRepository
        }),
        getServerStatus: new GetServerStatus({
            serverRepository
        }),
        getUserServers: new GetUserServers({
            serverRepository
        }),
        userCreditsRepository,
        configManager: defaultConfigManager,
        backgroundTaskQueue
    })

    // Schedule jobs
    scheduleServerCleanupRoutine({
        terminateEmptyServers: new TerminateEmptyServers({
            serverRepository,
            serverActivityRepository: serverActivityRepository,
            serverCommander: serverCommander,
            eventLogger,
            configManager: defaultConfigManager,
            backgroundTaskQueue
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
            serverManagerFactory: serverManagerFactory,
            serverCommander,
            eventLogger
        }),
        configManager: defaultConfigManager,
        eventLogger
    })

    schedulePendingServerCleanupRoutine({
        terminatePendingServers: new TerminatePendingServers({
            serverManagerFactory: serverManagerFactory,
            serverRepository,
            eventLogger,
            discordBot: client
        }),
        eventLogger
    })

    scheduleTerminateLongRunningServerRoutine({
        terminateLongRunningServers: new TerminateLongRunningServers({
            serverRepository,
            serverManagerFactory: serverManagerFactory,
            serverCommander,
            eventLogger
        }),
        eventLogger
    })

    const reportRepository = new SQLiteReportRepository({
        knex: KnexConnectionManager.client,
    })

    const oracleCostProvider = new OracleCostProvider({
        ociClientFactory: defaultOracleServiceFactory,
        configManager: defaultConfigManager,
    })

    const awsCostProvider = new AWSCostProvider({
        clientFactory: defaultAWSServiceFactory,
    })

    const defaultCostProvider = new DefaultCostProvider({
        oracleCostProvider,
        awsCostProvider,
    })

    scheduleMonthlyUsageReportRoutine({
        generateMonthlyUsageReport: new GenerateMonthlyUsageReport({
            reportRepository,
            costProvider: defaultCostProvider,
        }),
        configManager: defaultConfigManager,
        eventLogger,
        discordClient: client,
    })

    // Slash commands
    const commands = Object.values(discordCommands).map(command => command.definition)

    // Register commands with Discord API
    const rest = new REST({ version: '10' }).setToken(token);


    logger.emit({
        severityText: 'INFO',
        body: 'Started refreshing application (/) commands.'
    });

    // Register commands globally (this applies to all guilds)
    await rest.put(Routes.applicationCommands(clientId), {
        body: commands.map(command => command.toJSON()), // Convert CommandBuilder to JSON
    });

    logger.emit({
        severityText: 'INFO',
        body: 'Successfully reloaded application (/) commands.'
    });

    // Bot login
    client.once('ready', () => {
        logger.emit({
            severityText: 'INFO',
            body: `Logged in as ${client.user?.tag}`
        });
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
            logger.emit({
                severityText: 'ERROR',
                body: `Error executing command ${commandName}: ${error instanceof Error ? error.message : String(error)}`,
                attributes: {
                    error: JSON.stringify(error, Object.getOwnPropertyNames(error))
                }
            });
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

    // Start background task queue
    await backgroundTaskQueue.start();
    logger.emit({
        severityText: 'INFO',
        body: 'Background task queue started'
    });

    // Start UDP log listener with dependency injection
    startSrcdsCommandListener({
        serverCommander,
        userBanRepository,
        serverRepository,
        userRepository,
        eventLogger,
        backgroundTaskQueue
    });

    initializeExpress({})

    // Prevent crashes and log global errors
    process.on('unhandledRejection', (error: Error | any) => {
        logger.emit({
            severityText: 'ERROR',
            body: `Unhandled promise rejection: ${error instanceof Error ? error.message : String(error)}`,
            attributes: {
                error: JSON.stringify(error, Object.getOwnPropertyNames(error))
            }
        });
        eventLogger.log({
            eventMessage: `Unhandled promise rejection: ${error.message}`,
            actorId: 'system',
        })
    });
    process.on('uncaughtException', (error) => {
        logger.emit({
            severityText: 'ERROR',
            body: `Uncaught exception: ${error instanceof Error ? error.message : String(error)}`,
            attributes: {
                error: JSON.stringify(error, Object.getOwnPropertyNames(error))
            }
        });
        eventLogger.log({
            eventMessage: `Uncaught exception: ${error.message}`,
            actorId: 'system',
        })
    })

    process.on("SIGTERM", async () => {
        logger.emit({
            severityText: 'INFO',
            body: 'Received SIGTERM signal, shutting down gracefully...'
        })
        await backgroundTaskQueue.stop();
        await defaultGracefulShutdownManager.onShutdownWait();
        process.exit(0);
    });

    process.on("SIGINT", async () => {
        logger.emit({
            severityText: 'INFO',
            body: 'Received SIGINT signal, shutting down gracefully...'
        })
        await backgroundTaskQueue.stop();
        await defaultGracefulShutdownManager.onShutdownWait();
        process.exit(0);
    })

    return client;
}
