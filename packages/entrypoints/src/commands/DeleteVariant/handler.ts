import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { DeleteVariant } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

export function deleteVariantCommandHandlerFactory(dependencies: {
    deleteVariant: DeleteVariant;
}) {
    return async function deleteVariantCommandHandler(interaction: ChatInputCommandInteraction) {
        const { deleteVariant } = dependencies;

        if (!interaction.guildId) {
            await interaction.reply({
                content: 'This command can only be used in a guild.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const variantName = interaction.options.getString('variant_name', true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await deleteVariant.execute({
                guildId: interaction.guildId,
                variantName,
            });

            await interaction.editReply({
                content: `✅ Variant **${variantName}** has been deleted successfully!`
            });
        } catch (error) {
            await commandErrorHandler(interaction, error);
        }
    };
}
