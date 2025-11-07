import { describe, it, expect, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetServerStatus, ServerStatusSummary } from "../../../core/usecase/GetServerStatus";
import { createStatusCommandHandlerFactory } from "./handler";

describe("Status Command Handler", () => {
  function makeSut() {
    const getServerStatus = mock<GetServerStatus>();
    const handler = createStatusCommandHandlerFactory({ getServerStatus });

    return {
      handler,
      getServerStatus,
    };
  }

  it("should reply with formatted server status table", async () => {
    // Given
    const { handler, getServerStatus } = makeSut();
    const interaction = mock<ChatInputCommandInteraction>();
    const serverStatusSummary: ServerStatusSummary[] = [
      {
        region: "us-east-1",
        displayName: "US East",
        servers: { ready: 5, pending: 2, terminating: 1, total: 8 },
      },
      {
        region: "eu-west-1",
        displayName: "EU West",
        servers: { ready: 3, pending: 0, terminating: 0, total: 3 },
      },
    ];

    getServerStatus.execute.mockResolvedValue(serverStatusSummary);

    // When
    await handler(interaction);

    // Then
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("🖥️ **TF2-QuickServer Status**"),
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("US East"),
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("EU West"),
      flags: MessageFlags.Ephemeral,
    });
  });

  it("should include correct status icons and counts in table", async () => {
    // Given
    const { handler, getServerStatus } = makeSut();
    const interaction = mock<ChatInputCommandInteraction>();
    const serverStatusSummary: ServerStatusSummary[] = [
      {
        region: "us-west-2",
        displayName: "US West",
        servers: { ready: 1, pending: 1, terminating: 1, total: 3 },
      },
    ];

    getServerStatus.execute.mockResolvedValue(serverStatusSummary);

    // When
    await handler(interaction);

    // Then
    const call = (interaction.reply as any).mock.calls[0][0];
    expect(call.content).toContain("✅ 1");
    expect(call.content).toContain("⏳ 1");
    expect(call.content).toContain("🔴 1");
  });

  it("should handle empty server list gracefully", async () => {
    // Given
    const { handler, getServerStatus } = makeSut();
    const interaction = mock<ChatInputCommandInteraction>();
    const serverStatusSummary: ServerStatusSummary[] = [
      {
        region: "us-east-1",
        displayName: "US East",
        servers: { ready: 0, pending: 0, terminating: 0, total: 0 },
      },
    ];

    getServerStatus.execute.mockResolvedValue(serverStatusSummary);

    // When
    await handler(interaction);

    // Then
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("✅ 0"),
      flags: MessageFlags.Ephemeral,
    });
  });

  it("should format table with proper column alignment", async () => {
    // Given
    const { handler, getServerStatus } = makeSut();
    const interaction = mock<ChatInputCommandInteraction>();
    const serverStatusSummary: ServerStatusSummary[] = [
      {
        region: "us-east-1",
        displayName: "US East",
        servers: { ready: 10, pending: 5, terminating: 2, total: 17 },
      },
    ];

    getServerStatus.execute.mockResolvedValue(serverStatusSummary);

    // When
    await handler(interaction);

    // Then
    const call = (interaction.reply as any).mock.calls[0][0];
    const content = call.content as string;
    
    expect(content).toMatch(/\| Region\s+\| Running\s+\| Creating\s+\| Terminating\s+\|/);
    expect(content).toMatch(/\| -+\s+\| -+\s+\| -+\s+\| -+\s+\|/);
  });

  it("should set ephemeral flag for response visibility", async () => {
    // Given
    const { handler, getServerStatus } = makeSut();
    const interaction = mock<ChatInputCommandInteraction>();
    const serverStatusSummary: ServerStatusSummary[] = [];

    getServerStatus.execute.mockResolvedValue(serverStatusSummary);

    // When
    await handler(interaction);

    // Then
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral })
    );
  });

});
