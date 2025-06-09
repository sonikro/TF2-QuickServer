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
import { getRegionDisplayName, getVariantConfigs, Region } from "../../../core/domain";
import { CreateServerForUser } from "../../../core/usecase/CreateServerForUser";
import { createInteractionStatusUpdater } from "../../../providers/services/DiscordInteractionStatusUpdater";

export function createServerCommandHandlerFactory(dependencies: {
    createServerForUser: CreateServerForUser,
}) {
    return async function createServerCommandHandler(interaction: ChatInputCommandInteraction) {
        const { createServerForUser } = dependencies;
        const region = interaction.options.getString('region') as Region;

        // Step 1: Show variant buttons
        const variants = getVariantConfigs().filter(variant => {
            if (!variant.config.guildId) return true;
            return variant.config.guildId === interaction.guildId;
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
        const collector = interaction.channel?.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30_000,
            max: 1
        });
        if (!collector) return;
        collector.on('collect', async (buttonInteraction: MessageComponentInteraction) => {
            try {
                await interaction.editReply({
                    content: `You selected the variant: ${buttonInteraction.customId.split(':')[1]}. Processing your request...`,
                    components: []
                })
            } catch (error) {
                // If the edit fails, we can log the error but continue with the button interaction
                // This is not critical, as the button interaction will still proceed
                console.error('Error editing reply:', error);
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
                console.error('Error creating server:', error);
                switch (error.name) {
                    case 'UserError':
                        await buttonInteraction.followUp({
                            content: error.message,
                            flags: MessageFlags.Ephemeral
                        });
                        break;
                    case 'AbortError':
                        await buttonInteraction.followUp({
                            content: `Server creation was aborted by the user.`,
                            flags: MessageFlags.Ephemeral
                        });
                        break;
                    default:
                        await buttonInteraction.followUp({
                            content: `There was an error creating the server. Please reach out to the App Administrator.`,
                            flags: MessageFlags.Ephemeral
                        });
                        break;
                }
            }
        });
        collector.on('end', (collected: Collection<string, MessageComponentInteraction>) => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'No variant selected. Command timed out.', components: [] });
            }
        });
    }
}
