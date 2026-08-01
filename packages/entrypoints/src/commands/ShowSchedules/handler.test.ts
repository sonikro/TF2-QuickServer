import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetUserSchedules, Region, ScheduledServer } from "@tf2qs/core";
import { showSchedulesCommandHandlerFactory } from "./handler";

describe("showSchedulesCommandHandler", () => {
    const chance = new Chance();

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        const getUserSchedules = mock<GetUserSchedules>();
        const handler = showSchedulesCommandHandlerFactory({ getUserSchedules });

        return { interaction, getUserSchedules, handler };
    };

    const createSchedule = (overrides: Partial<ScheduledServer> = {}): ScheduledServer => mock<ScheduledServer>({
        id: chance.guid(),
        userId: interactionUser(),
        region: "sa-saopaulo-1" as Region,
        variant: "standard-competitive",
        scheduledAt: new Date("2026-08-01T21:30:00Z"),
        status: "scheduled",
        timezone: "UTC",
        ...overrides,
    });

    const interactionUser = () => "user-1";

    it("should reply with an empty state when there are no schedules", async () => {
        const { handler, interaction, getUserSchedules } = createHandler();
        when(getUserSchedules.execute).calledWith({ userId: interaction.user.id }).thenResolve([]);

        await handler(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("don't have any scheduled servers"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with formatted schedule details", async () => {
        const { handler, interaction, getUserSchedules } = createHandler();
        const schedules = [createSchedule()];
        when(getUserSchedules.execute).calledWith({ userId: interaction.user.id }).thenResolve(schedules);

        await handler(interaction);

        const replyCall = (interaction.reply as any).mock.calls[0][0];
        expect(replyCall.content).toContain("Your Scheduled Servers");
        expect(replyCall.content).toContain("Schedule 1");
        expect(replyCall.content).toContain("Scheduled");
        expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
    });

    it("should reply with a too-many-schedules warning when the content is too long", async () => {
        const { handler, interaction, getUserSchedules } = createHandler();
        const schedules = Array.from({ length: 10 }, (_, i) => createSchedule({ id: `s${i}` }));
        when(getUserSchedules.execute).calledWith({ userId: interaction.user.id }).thenResolve(schedules);

        await handler(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("too many schedules"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should call commandErrorHandler when the use case fails", async () => {
        const { handler, interaction, getUserSchedules } = createHandler();
        interaction.followUp = vi.fn().mockResolvedValue(undefined) as any;
        when(getUserSchedules.execute).calledWith({ userId: interaction.user.id }).thenReject(new Error("db down"));

        await handler(interaction);

        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "There was an unexpected error running the command. Please reach out to the App Administrator.",
            flags: MessageFlags.Ephemeral,
        });
    });
});
