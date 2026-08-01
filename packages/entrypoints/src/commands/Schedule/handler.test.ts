import { Chance } from "chance";
import { ChatInputCommandInteraction, Collection, InteractionCollector, Message, MessageComponentInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { CreateScheduledServer, Region, ScheduledServer, UserError } from "@tf2qs/core";
import { createScheduleCommandHandlerFactory } from "./handler";

describe("scheduleCommandHandler", () => {
    const chance = new Chance();

    const getTestRegion = () => "sa-saopaulo-1" as Region;

    const createHandler = () => {
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.options = mock();
        interaction.user.id = chance.guid();
        interaction.guildId = chance.guid();
        Object.defineProperty(interaction, "channel", {
            value: mock<any>(),
            writable: false,
        });

        const message = mock<Message<boolean>>()
        when(interaction.fetchReply).calledWith().thenResolve(message)
        const collector = mock<InteractionCollector<any>>();
        when(message.createMessageComponentCollector).calledWith(expect.anything()).thenReturn(collector);

        const createScheduledServer = mock<CreateScheduledServer>();
        const handler = createScheduleCommandHandlerFactory({
            createScheduledServer,
        });

        return {
            createScheduledServer,
            interaction,
            handler,
            message,
            collector,
        };
    };

    const mockButtonInteraction = (interaction: ChatInputCommandInteraction, variantName: string) => {
        const buttonInteraction = mock<MessageComponentInteraction>();
        buttonInteraction.customId = `schedule-variant:${variantName}`;
        buttonInteraction.user = interaction.user;
        buttonInteraction.guildId = interaction.guildId;
        buttonInteraction.deferReply = vi.fn().mockResolvedValue(undefined) as any;
        buttonInteraction.followUp = vi.fn().mockResolvedValue(undefined) as any;
        return buttonInteraction;
    };

    const setOptions = (interaction: ChatInputCommandInteraction, region: string, time: string, timezone: string) => {
        when(interaction.options.getString).calledWith("region").thenReturn(region);
        when(interaction.options.getString).calledWith("time").thenReturn(time);
        when(interaction.options.getString).calledWith("timezone").thenReturn(timezone);
    };

    const collectCallbackOf = async (collector: ReturnType<typeof mock<InteractionCollector<any>>>, buttonInteraction: MessageComponentInteraction) => {
        const collectCall = collector.on.mock.calls.find(call => call[0] === "collect");
        if (!collectCall) throw new Error("Collect callback not found");
        await collectCall[1](buttonInteraction);
    };

    it("should reply with an error for an invalid time format", async () => {
        const { handler, interaction } = createHandler();
        setOptions(interaction, getTestRegion(), "25:99", "UTC");
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("Invalid time"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should call commandErrorHandler when scheduling fails on variant selection", async () => {
        const { handler, interaction, createScheduledServer, collector } = createHandler();
        const region = getTestRegion();
        const time = "21:30";
        const timezone = "UTC";
        setOptions(interaction, region, time, timezone);
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        when(createScheduledServer.execute).calledWith(expect.anything()).thenReject(new UserError("You must enable DMs."));

        await handler(interaction);

        const buttonInteraction = mockButtonInteraction(interaction, "standard-competitive");
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;
        await collectCallbackOf(collector, buttonInteraction);

        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: "You must enable DMs.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should surface the already-have-a-schedule UserError from the use case on variant selection", async () => {
        const { handler, interaction, createScheduledServer, collector } = createHandler();
        const region = getTestRegion();
        const time = "21:30";
        const timezone = "America/New_York";
        setOptions(interaction, region, time, timezone);
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        const alreadyScheduled = new UserError(
            "You can only schedule one server at a time. You already have a schedule for Standard Competitive on Mon, Aug 3, 2026 at 17:30."
        );
        when(createScheduledServer.execute).calledWith(expect.anything()).thenReject(alreadyScheduled);

        await handler(interaction);

        const buttonInteraction = mockButtonInteraction(interaction, "standard-competitive");
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;
        await collectCallbackOf(collector, buttonInteraction);

        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: "You can only schedule one server at a time. You already have a schedule for Standard Competitive on Mon, Aug 3, 2026 at 17:30.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should reply with variant buttons and schedule on variant selection", async () => {
        const { handler, interaction, createScheduledServer, collector } = createHandler();
        const region = getTestRegion();
        const time = "21:30";
        const timezone = "America/New_York";
        setOptions(interaction, region, time, timezone);
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;

        const scheduled = mock<ScheduledServer>({
            id: "schedule-1",
            userId: interaction.user.id,
            region,
            variant: "standard-competitive",
            scheduledAt: new Date("2026-08-02T21:30:00Z"),
            status: "scheduled",
            timezone,
        });
        when(createScheduledServer.execute).calledWith({
            userId: interaction.user.id,
            guildId: interaction.guildId ?? undefined,
            region,
            variantName: "standard-competitive",
            time,
            timezone,
        }).thenResolve(scheduled);

        await handler(interaction);

        const replyCall = (interaction.reply as any).mock.calls[0][0];
        expect(replyCall.content).toContain("Server will be ready at");
        expect(replyCall.components.length).toBeGreaterThan(0);

        const buttonInteraction = mockButtonInteraction(interaction, "standard-competitive");
        buttonInteraction.editReply = vi.fn().mockResolvedValue(undefined) as any;
        await collectCallbackOf(collector, buttonInteraction);

        expect(createScheduledServer.execute).toHaveBeenCalledWith({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            region,
            variantName: "standard-competitive",
            time,
            timezone,
        });
        expect(buttonInteraction.deferReply).toHaveBeenCalled();
        expect(buttonInteraction.followUp).toHaveBeenCalledWith({
            content: expect.stringContaining("Server Scheduled!"),
            flags: MessageFlags.Ephemeral,
        });
    });

    it("should edit the reply with a timeout message when no variant is selected", async () => {
        const { handler, interaction, collector } = createHandler();
        setOptions(interaction, getTestRegion(), "21:30", "UTC");
        interaction.reply = vi.fn().mockResolvedValue(undefined) as any;
        interaction.editReply = vi.fn().mockResolvedValue(undefined) as any;

        await handler(interaction);

        const endCall = collector.on.mock.calls.find(call => call[0] === "end");
        if (!endCall) throw new Error("End callback not found");
        endCall[1](new Collection<string, MessageComponentInteraction>());

        expect(interaction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining("No variant selected"),
            components: [],
        });
    });
});
