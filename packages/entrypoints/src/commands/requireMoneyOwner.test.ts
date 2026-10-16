import { ChatInputCommandInteraction, MessageFlags, PermissionsBitField } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { requireMoneyOwner } from "./requireMoneyOwner";
import Chance from "chance";

const chance = new Chance();

describe("requireMoneyOwner", () => {
    const makeSut = (overrides: { allowedUserIds?: string[]; action?: string } = {}) => {
        const allowedUserIds = overrides.allowedUserIds ?? ['owner-id'];
        const action = overrides.action ?? 'register donations';
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = chance.guid();
        interaction.user = { id: 'owner-id' } as any;
        const memberPermissions = mock<PermissionsBitField>();
        memberPermissions.has.mockReturnValue(true);
        interaction.memberPermissions = memberPermissions as any;
        return { interaction, allowedUserIds, action, memberPermissions };
    };

    it("should authorize an allowlisted administrator in a guild", async () => {
        // Given
        const { interaction, allowedUserIds, action } = makeSut();

        // When
        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action });

        // Then
        expect(authorized).toBe(true);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("should reject the command when invoked in DMs (no guildId)", async () => {
        // Given
        const { interaction, allowedUserIds, action } = makeSut();
        interaction.guildId = null as any;

        // When
        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action });

        // Then
        expect(authorized).toBe(false);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '❌ This command is only available within a Discord server, not in direct messages.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reject the command when user lacks Administrator permission", async () => {
        // Given
        const { interaction, allowedUserIds, action, memberPermissions } = makeSut();
        memberPermissions.has.mockReturnValue(false);

        // When
        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action });

        // Then
        expect(authorized).toBe(false);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `❌ Only users with the **Administrator** permission can ${action}.`,
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reject the command when memberPermissions is null", async () => {
        // Given
        const { interaction, allowedUserIds, action } = makeSut();
        interaction.memberPermissions = null as any;

        // When
        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action });

        // Then
        expect(authorized).toBe(false);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: `❌ Only users with the **Administrator** permission can ${action}.`,
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reject the command when user is not in the allowlist", async () => {
        // Given
        const { interaction, allowedUserIds, action } = makeSut({ allowedUserIds: ['other-user'] });

        // When
        const authorized = await requireMoneyOwner({ interaction, allowedUserIds, action });

        // Then
        expect(authorized).toBe(false);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '❌ You are not authorized to use this command.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should word the permission denial with the requested action", async () => {
        // Given
        const { interaction, allowedUserIds } = makeSut();
        interaction.memberPermissions = null as any;

        // When
        await requireMoneyOwner({ interaction, allowedUserIds, action: 'check the balance' });

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '❌ Only users with the **Administrator** permission can check the balance.',
            flags: MessageFlags.Ephemeral
        });
    });
});
