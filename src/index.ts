import { config } from 'dotenv';
import { startDiscordBot } from "./entrypoints/discordBot";

// Load environment variables from .env file
config();

// Initialize the Discord bot
startDiscordBot()
    .then(() => {
        console.log('Discord bot started successfully.');
    })
    .catch((error) => {
        console.error('Error starting Discord bot:', error);
    });