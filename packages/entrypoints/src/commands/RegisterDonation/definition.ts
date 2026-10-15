import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const registerDonationCommandDefinition = new SlashCommandBuilder()
    .setName('register-donation')
    .setDescription('Register a manual donation in the money ledger (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addNumberOption(option =>
        option.setName('amount')
            .setDescription('Donation amount, must be greater than zero')
            .setRequired(true)
            .setMinValue(0.01))
    .addStringOption(option =>
        option.setName('currency')
            .setDescription('Donation currency')
            .setRequired(true)
            .addChoices(
                { name: 'BRL', value: 'BRL' },
                { name: 'USD', value: 'USD' },
            ))
    .addStringOption(option =>
        option.setName('source')
            .setDescription('Donation source, 3-120 characters')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(120));
