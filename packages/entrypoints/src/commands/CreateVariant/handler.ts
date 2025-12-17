import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { CreateVariant } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

export function createVariantCommandHandlerFactory(dependencies: {
    createVariant: CreateVariant;
}) {
    return async function createVariantCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createVariant } = dependencies;

        if (!interaction.guildId) {
            await interaction.reply({
                content: 'This command can only be used in a guild.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const variantName = interaction.options.getString('variant_name', true);
        const displayName = interaction.options.getString('display_name', true);
        const hostname = interaction.options.getString('hostname');
        const defaultCfgsStr = interaction.options.getString('default_cfgs');
        const adminsStr = interaction.options.getString('admins');
        const image = interaction.options.getString('image');

        if (variantName.includes(' ')) {
            await interaction.reply({
                content: 'Variant name cannot contain spaces.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        let defaultCfgs: Record<string, string> | undefined;
        if (defaultCfgsStr) {
            try {
                defaultCfgs = JSON.parse(defaultCfgsStr);
            } catch (error) {
                await interaction.reply({
                    content: 'Invalid JSON format for default_cfgs. Example: {"5cp": "config.cfg", "koth": "koth.cfg"}',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
        }

        const admins = adminsStr ? adminsStr.split(',').map(s => s.trim()) : undefined;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await createVariant.execute({
                guildId: interaction.guildId,
                variantName,
                displayName,
                hostname: hostname || undefined,
                defaultCfgs,
                admins,
                image: image || undefined,
            });

            await interaction.editReply({
                content: `✅ Variant **${displayName}** (${variantName}) has been created successfully!\n\n` +
                    `This variant is now available when creating servers in this guild.\n\n` +
                    `⚠️ Note: Custom variants currently use default server infrastructure settings. ` +
                    `Custom hostname, admins, and other settings will be applied in a future update.`
            });
        } catch (error) {
            await commandErrorHandler(interaction, error);
        }
    };
}
