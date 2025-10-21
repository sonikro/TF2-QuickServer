import { logger } from '../../../telemetry/otel';
import {
    ChatInputCommandInteraction,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageComponentInteraction,
    Collection,
    PermissionFlagsBits
} from "discord.js";
import { getRegionDisplayName, getVariantConfigs, Region } from "../../../core/domain";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";
import { createInteractionStatusUpdater } from "../../../providers/services/DiscordInteractionStatusUpdater";
import { commandErrorHandler } from "../commandErrorHandler";
import { defaultGracefulShutdownManager } from "../../../providers/services/DefaultGracefulShutdownManager";
import { BackgroundTaskQueue } from "../../../core/services/BackgroundTaskQueue";
import { DeleteServerTaskData } from "../../../providers/queue/DeleteServerTaskProcessor";

export function createServerCommandHandlerFactory(dependencies: {
    createServerForUser: CreateServerForUser,
    backgroundTaskQueue: BackgroundTaskQueue,
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createServerForUser, backgroundTaskQueue } = dependencies;
        const region = interaction.options.getString('region') as Region;

        // Step 1: Show variant buttons
        const variants = getVariantConfigs().filter(variant => {
            // Filter by guildId
            if (variant.config.guildId && variant.config.guildId !== interaction.guildId) {
                return false;
            }

            // Do not show 32-bit variants in Santiago
            if (region === Region.SA_SANTIAGO_1 && !variant.config.image.includes("amd64")) {
                return false;
            }
            return true;
        });

        const rows = [];
        for (let i = 0; i < variants.length; i += 5) {
            rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...variants.slice(i, i + 5).map(variant =>
                    new ButtonBuilder()
                        .setCustomId(`create-server-variant:${variant.name}`)
                        .setLabel(variant.config.displayName || variant.name)
                        .setStyle(ButtonStyle.Primary)
                )
            ));
        }
        // Step 1: Show variant descriptions above the buttons
        let variantDescriptions = variants.map(variant => {
            const cfgs = variant.config.defaultCfgs
                ? Object.entries(variant.config.defaultCfgs).map(([type, cfg]) => `${type}: ${cfg}`).join("\n")
                : "";
            return `**${variant.config.displayName || variant.name}**${cfgs ? `\nDefault CFGs:\n${cfgs}` : ""}`;
        }).join("\n\n");

        await interaction.reply({
            content: `Select a server variant to deploy in region **${getRegionDisplayName(region)}**:` +
                `\n\n${variantDescriptions}` +
                `\n\n⚠️ *This command shows you different options based on the Discord Guild it is executed in. If you are not seeing an option you are looking for, you are probably in the wrong Discord guild.*`,
            components: rows,
            flags: MessageFlags.Ephemeral
        });

        // Step 2: Wait for button interaction
        const filter = (i: MessageComponentInteraction) =>
            i.user.id === interaction.user.id && i.customId.startsWith('create-server-variant:');
        const replyMessage = await interaction.fetchReply();
        const collector = replyMessage.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30_000,
            max: 1
        });
        if (!collector) return;
        collector.on('collect', async (buttonInteraction: MessageComponentInteraction) => {
            await defaultGracefulShutdownManager.run(async () => {
                try {
                    await interaction.editReply({
                        content: `You selected the variant: ${buttonInteraction.customId.split(':')[1]}. Processing your request...`,
                        components: []
                    })
                } catch (error) {
                    // If the edit fails, we can log the error but continue with the button interaction
                    // This is not critical, as the button interaction will still proceed
                    logger.emit({ severityText: 'ERROR', body: 'Error editing reply', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
                }
                const variantName = buttonInteraction.customId.split(':')[1];
                await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    await buttonInteraction.editReply({
                        content: `Creating server in region ${getRegionDisplayName(region)} with the variant ${variantName}. You will receive the server details shortly. This can take up to 4 minutes.`,
                    });
                    const deployedServer = await createServerForUser.execute({
                        region: region,
                        variantName: variantName,
                        creatorId: buttonInteraction.user.id,
                        guildId: buttonInteraction.guildId!,
                        statusUpdater: createInteractionStatusUpdater(buttonInteraction)
                    });
                    if (variantName.includes("tf2pickup")) {
                        await buttonInteraction.followUp({
                            content: `🎉 **Server Created and Registered!** 🎉\n\n` +
                                `💻 This server was created and registered to the **tf2pickup.org** instance associated with this Discord Guild.\n` +
                                `🔒 You will not receive the credentials or connect information, as using the server is managed by the **tf2pickup** instance.\n` +
                                `✅ The server is now **available to be used**!`,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }
                    await buttonInteraction.followUp({
                        content: `🎉 **Server Created Successfully!** 🎉\n\n` +
                            `🆔 **Server ID:** \`${deployedServer.serverId}\`\n` +
                            `🌍 **Region:** \`${getRegionDisplayName(deployedServer.region)}\`\n` +
                            `🎮 **Variant:** \`${deployedServer.variant}\`\n\n` +
                            `**CONNECT Addresses:**\n` +
                            `- **SDR Connect:**\n` +
                            `\`\`\`\nconnect ${deployedServer.hostIp}:${deployedServer.hostPort};${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                            `- **Direct Connect:**\n` +
                            `\`\`\`\nconnect ${deployedServer.rconAddress}:27015;${deployedServer.hostPassword ? `password ${deployedServer.hostPassword}` : ''}\n\`\`\`\n` +
                            `- **TV Connect:**\n` +
                            `\`\`\`\nconnect ${deployedServer.tvIp}:${deployedServer.tvPort};${deployedServer.tvPassword ? `password ${deployedServer.tvPassword}` : ''}\n\`\`\`\n` +
                            `⚠️ **Warning:** If you are connecting from the SDR IP, use the following RCON commands in the console:\n` +
                            `\`\`\`\nrcon_address ${deployedServer.rconAddress}\nrcon_password ${deployedServer.rconPassword}\n\`\`\`\n`,
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error: Error | any) {
                    // Log the error for debugging
                    if (error.name !== 'UserError') {
                        logger.emit({
                            severityText: 'ERROR',
                            body: 'Server creation failed, triggering automatic cleanup',
                            attributes: {
                                userId: buttonInteraction.user.id,
                                region,
                                variant: variantName,
                                error: error instanceof Error ? error.message : String(error)
                            }
                        });

                        // Trigger cleanup task to delete all user servers (including the failed one)
                        try {
                            const taskData: DeleteServerTaskData = { userId: buttonInteraction.user.id };
                            await backgroundTaskQueue.enqueue('delete-server', taskData, {
                                onSuccess: async () => {
                                    logger.emit({
                                        severityText: 'INFO',
                                        body: 'Automatic server cleanup completed successfully after creation failure',
                                        attributes: {
                                            userId: buttonInteraction.user.id
                                        }
                                    });
                                },
                                onError: async (cleanupError: Error) => {
                                    logger.emit({
                                        severityText: 'ERROR',
                                        body: 'Automatic server cleanup failed after creation failure',
                                        attributes: {
                                            userId: buttonInteraction.user.id,
                                            cleanupError: cleanupError.message
                                        }
                                    });
                                }
                            });
                        } catch (queueError) {
                            logger.emit({
                                severityText: 'ERROR',
                                body: 'Failed to enqueue cleanup task after server creation failure',
                                attributes: {
                                    userId: buttonInteraction.user.id,
                                    queueError: queueError instanceof Error ? queueError.message : String(queueError)
                                }
                            });
                        }
                    }

                    await commandErrorHandler(buttonInteraction, error);
                }
            });
        });
        collector.on('end', (collected: Collection<string, MessageComponentInteraction>) => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'No variant selected. Command timed out.', components: [] });
            }
        });
    }
}
