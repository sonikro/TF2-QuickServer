import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetServerStatus } from "../../../core/usecase/GetServerStatus";
import { commandErrorHandler } from "../commandErrorHandler";

const statusIcons = {
    ready: "✅",
    pending: "⏳",
    terminating: "🔴",
};

function formatServerLine(displayName: string, summary: { ready: number; pending: number; terminating: number; total: number }): string {
    const region = displayName.padEnd(30);
    const running = `${statusIcons.ready} ${summary.ready}`.padEnd(9);
    const creating = `${statusIcons.pending} ${summary.pending}`.padEnd(8);
    const terminating = `${statusIcons.terminating} ${summary.terminating}`.padEnd(11);
    
    return `| ${region} | ${running} | ${creating} | ${terminating} |`;
}

function formatStatusTable(serverStatusSummary: Array<{ displayName: string; servers: { ready: number; pending: number; terminating: number; total: number } }>): string {
    const header = "| Region                         | Running    | Creating   | Terminating  |";
    const separator = "| ------------------------------ | ---------- | ---------- | ------------ |";
    const rows = serverStatusSummary.map(summary => formatServerLine(summary.displayName, summary.servers));
    
    return [header, separator, ...rows].join("\n");
}

export function createStatusCommandHandlerFactory(dependencies: {
    getServerStatus: GetServerStatus;
}) {
    return async function statusCommandHandler(interaction: ChatInputCommandInteraction) {
        const { getServerStatus } = dependencies;

        try {
            const serverStatusSummary = await getServerStatus.execute();

            const table = formatStatusTable(serverStatusSummary);

            await interaction.reply({
                content: `🖥️ **TF2-QuickServer Status**\n\`\`\`\n${table}\n\`\`\``,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}
