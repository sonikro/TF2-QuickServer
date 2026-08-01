import { ScheduledServer, getRegionDisplayName, getVariantConfig } from "@tf2qs/core";
import { formatDateTimeInTimeZone, formatDurationUntil } from "@tf2qs/core";

const STATUS_LABELS: Record<ScheduledServer['status'], string> = {
    scheduled: '⏳ Scheduled',
    creating: '🛠️ Creating',
    created: '✅ Created',
    failed: '❌ Failed',
    cancelled: '🚫 Cancelled',
};

export function formatScheduledServerMessage(schedule: ScheduledServer, index?: number): string {
    const regionDisplayName = getRegionDisplayName(schedule.region);
    const variantDisplayName = getVariantConfig(schedule.variant).displayName ?? schedule.variant;
    const scheduleNumber = index !== undefined ? `**Schedule ${index + 1}** (${regionDisplayName})` : `**${regionDisplayName}**`;
    const now = new Date();
    const relative = schedule.status === 'scheduled'
        ? `(${formatDurationUntil(schedule.scheduledAt, now)} from now)`
        : '';

    return `${scheduleNumber}\n` +
        `🌍 **Region:** \`${regionDisplayName}\`\n` +
        `🎮 **Variant:** \`${variantDisplayName}\`\n` +
        `📡 **Status:** ${STATUS_LABELS[schedule.status]}\n` +
        `⏰ **Ready at:** ${formatDateTimeInTimeZone(schedule.scheduledAt, schedule.timezone)} (${schedule.timezone}) ${relative}\n` +
        `🕐 (${formatDateTimeInTimeZone(schedule.scheduledAt, 'UTC')} UTC)`;
}
