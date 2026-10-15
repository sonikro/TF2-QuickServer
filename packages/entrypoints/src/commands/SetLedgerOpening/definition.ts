import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const setLedgerOpeningCommandDefinition = new SlashCommandBuilder()
    .setName('set-ledger-opening')
    .setDescription('Record the ledger opening balance (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addNumberOption(option =>
        option.setName('amount')
            .setDescription('Opening balance amount, must be greater than zero')
            .setRequired(true)
            .setMinValue(0.01))
    .addStringOption(option =>
        option.setName('currency')
            .setDescription('Opening balance currency')
            .setRequired(true)
            .addChoices(
                { name: 'BRL', value: 'BRL' },
                { name: 'USD', value: 'USD' },
            ));
