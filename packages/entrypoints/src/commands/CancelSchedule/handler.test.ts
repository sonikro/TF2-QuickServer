import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CancelScheduledServer, Region, ScheduledServer, UserError } from "@tf2qs/core";
import { cancelScheduleCommandHandlerFactory } from "./handler";

describe("cancelScheduleCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.deferReply = vi.fn().mockResolvedValue(undefined) as any;
        interaction.followUp = vi.fn().mockResolvedValue(undefined) as any;

        const cancelScheduledServer = mock<CancelScheduledServer>();
        const handler = cancelScheduleCommandHandlerFactory({ cancelScheduledServer });

        return { interaction, cancelScheduledServer, handler };
    };

    const createCancelled = (): ScheduledServer => mock<ScheduledServer>({
        id: chance.guid(),
        userId: "user-1",
        region: "sa-saopaulo-1" as Region,
        variant: "standard-competitive",
        scheduledAt: new Date("2026-08-01T21:30:00Z"),
        status: "cancelled",
        timezone: "America/New_York",
    });

    it("should cancel the schedule and confirm via followUp", async () => {
        const { handler, interaction, cancelScheduledServer } = createHandler();
        const cancelled = createCancelled();
        when(cancelScheduledServer.execute).calledWith({ userId: interaction.user.id }).thenResolve(cancelled);

        await handler(interaction);

        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining("Schedule cancelled"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should call commandErrorHandler on UserError", async () => {
        const { handler, interaction, cancelScheduledServer } = createHandler();
        when(cancelScheduledServer.execute).calledWith({ userId: interaction.user.id })
            .thenReject(new UserError("You don't have an active scheduled server."));

        await handler(interaction);

        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "You don't have an active scheduled server.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should call commandErrorHandler on unexpected errors", async () => {
        const { handler, interaction, cancelScheduledServer } = createHandler();
        when(cancelScheduledServer.execute).calledWith({ userId: interaction.user.id })
            .thenReject(new Error("boom"));

        await handler(interaction);

        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "There was an unexpected error running the command. Please reach out to the App Administrator.",
            flags: MessageFlags.Ephemeral,
        });
    });
});
