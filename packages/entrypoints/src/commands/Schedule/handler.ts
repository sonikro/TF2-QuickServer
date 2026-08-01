import { logger } from '@tf2qs/telemetry';
import {
    ChatInputCommandInteraction,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageComponentInteraction,
    Collection
} from "discord.js";
import { getVariantConfigs, getVariantConfig, getRegionDisplayName, Region } from "@tf2qs/core";
import { CreateScheduledServer, ScheduledServer } from "@tf2qs/core";
import { getScheduledCreationLeadMinutes } from "@tf2qs/core";
import { computeNextOccurrence, formatDateTimeInTimeZone, formatDurationUntil, isValidScheduleTime } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";
import { defaultGracefulShutdownManager } from "@tf2qs/providers";

export function createScheduleCommandHandlerFactory(dependencies: {
    createScheduledServer: CreateScheduledServer,
}) {
    return async function scheduleCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createScheduledServer } = dependencies;
        const userId = interaction.user.id;
        const region = interaction.options.getString('region') as Region;
        const time = interaction.options.getString('time')!;
        const timezone = interaction.options.getString('timezone')!;

        // Validate the time format up-front
        if (!isValidScheduleTime(time)) {
            await interaction.reply({
                content: 'Invalid time. Use HH:mm in 24h format (e.g. 21:30).',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Build the preview using the same math as the use case
        const now = new Date();
        const scheduledAt = computeNextOccurrence({ time, timezone, now });
        const triggerAt = new Date(scheduledAt.getTime() - getScheduledCreationLeadMinutes(region) * 60_000);
        const regionDisplayName = getRegionDisplayName(region);

        // Step 1: Show variant buttons
        const allVariants = getVariantConfigs();
        const guildSpecificVariants = allVariants.filter(variant =>
            variant.config.guildId === interaction.guildId
        );

        const variants = guildSpecificVariants.length > 0
            ? guildSpecificVariants
            : allVariants.filter(variant => !variant.config.guildId);

        const rows = [];
        for (let i = 0; i < variants.length; i += 5) {
            rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...variants.slice(i, i + 5).map(variant =>
                    new ButtonBuilder()
                        .setCustomId(`schedule-variant:${variant.name}`)
                        .setLabel(variant.config.displayName || variant.name)
                        .setStyle(ButtonStyle.Primary)
                )
            ));
        }

        let variantDescriptions = variants.map(variant => {
            const cfgs = variant.config.defaultCfgs
                ? Object.entries(variant.config.defaultCfgs).map(([type, cfg]) => `${type}: ${cfg}`).join("\n")
                : "";
            return `**${variant.config.displayName || variant.name}**${cfgs ? `\nDefault CFGs:\n${cfgs}` : ""}`;
        }).join("\n\n");

        await interaction.reply({
            content: `⏰ **Server will be ready at:** **${formatDateTimeInTimeZone(scheduledAt, timezone)}** (${timezone})\n` +
                `🕐 (${formatDateTimeInTimeZone(scheduledAt, 'UTC')} UTC) — ${formatDurationUntil(scheduledAt, now)} from now\n\n` +
                `Select a server variant to schedule in region **${regionDisplayName}**:` +
                `\n\n${variantDescriptions}`,
            components: rows,
            flags: MessageFlags.Ephemeral
        });

        // Step 2: Wait for button interaction
        const filter = (i: MessageComponentInteraction) =>
            i.user.id === interaction.user.id && i.customId.startsWith('schedule-variant:');
        const replyMessage = await interaction.fetchReply();
        const collector = replyMessage.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30_000,
            max: 1
        });
        collector.on('collect', async (buttonInteraction: MessageComponentInteraction) => {
            await defaultGracefulShutdownManager.run(async () => {
                try {
                    await interaction.editReply({
                        content: `You selected the variant: ${buttonInteraction.customId.split(':')[1]}. Processing your request...`,
                        components: []
                    })
                } catch (error) {
                    logger.emit({ severityText: 'ERROR', body: 'Error editing reply', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
                }
                const variantName = buttonInteraction.customId.split(':')[1];
                await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const schedule: ScheduledServer = await createScheduledServer.execute({
                        userId,
                        guildId: interaction.guildId ?? undefined,
                        region,
                        variantName,
                        time,
                        timezone
                    });
                    const variantDisplayName = getVariantConfig(variantName).displayName ?? variantName;
                    await buttonInteraction.followUp({
                        content: `✅ **Server Scheduled!**\n` +
                            `Region: **${getRegionDisplayName(region)}** · Variant: **${variantDisplayName}**\n` +
                            `⏰ Ready at: **${formatDateTimeInTimeZone(schedule.scheduledAt, timezone)}** (${timezone})\n` +
                            `🕐 (${formatDateTimeInTimeZone(schedule.scheduledAt, 'UTC')} UTC) — ${formatDurationUntil(schedule.scheduledAt, new Date())} from now`,
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error: Error | any) {
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
