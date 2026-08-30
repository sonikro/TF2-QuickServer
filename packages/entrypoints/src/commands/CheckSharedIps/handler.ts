import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { ComparePlayerSharedIps, formatDateTimeInTimeZone, maskIp, SharedIp } from "@tf2qs/core";
import { commandErrorHandler } from "../commandErrorHandler";

type CheckSharedIpsCommandHandlerFactoryDependencies = {
    comparePlayerSharedIps: ComparePlayerSharedIps;
    allowedUserIds: string[];
};

export function checkSharedIpsCommandHandlerFactory(dependencies: CheckSharedIpsCommandHandlerFactoryDependencies) {
    return async function checkSharedIpsCommandHandler(interaction: ChatInputCommandInteraction) {
        const { comparePlayerSharedIps, allowedUserIds } = dependencies;

        if (!interaction.guildId) {
            await interaction.reply({
                content: '❌ This command is only available within a Discord server, not in direct messages.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ Only users with the **Administrator** permission can check shared IP history.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (!allowedUserIds.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You are not authorized to use this command.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const steamIdTextA = interaction.options.getString('steam_id_a', true);
        const steamIdTextB = interaction.options.getString('steam_id_b', true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const result = await comparePlayerSharedIps.execute({ steamId3TextA: steamIdTextA, steamId3TextB: steamIdTextB });

            if (result.sharedIps.length === 0) {
                await interaction.followUp({
                    content: 'Players have never shared an IP address.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const sharedIpLines = result.sharedIps.map(formatSharedIpLine(result.steamId3a, result.steamId3b)).join('\n');
            await interaction.followUp({
                content: `Players have shared ${result.sharedIps.length} IP address(es):\n${sharedIpLines}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error: Error | any) {
            await commandErrorHandler(interaction, error);
        }
    };
}

function formatSharedIpLine(steamId3a: string, steamId3b: string) {
    return (sharedIp: SharedIp): string => {
        return `**${maskIp(sharedIp.ipAddress)}** — first seen by ${steamId3a} at ${formatDateTimeInTimeZone(sharedIp.playerAFirstSeenAt, 'UTC')} UTC; by ${steamId3b} at ${formatDateTimeInTimeZone(sharedIp.playerBFirstSeenAt, 'UTC')} UTC`;
    };
}
