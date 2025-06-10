import { Chance } from "chance";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { SetUserData } from "../../../core/usecase/SetUserData";
import { setUserDataHandlerFactory } from "./handler";

describe("setUserDataCommandHandler", () => {
  const chance = new Chance();

  const createHandler = () => {
    const setUserData = mock<SetUserData>();
    const interaction = mock<ChatInputCommandInteraction>();
    interaction.options = mock();

    const handler = setUserDataHandlerFactory({
      setUserData,
    });

    return {
      setUserData,
      interaction,
      handler,
    };
  };

  it("should set user data with the specified steamIdText", async () => {
    // Given
    const { handler, interaction, setUserData } = createHandler();
    const steamIdText = chance.string({ length: 17, pool: "0123456789" });

    interaction.user = mock();
    interaction.user.id = chance.guid();
    when(interaction.options.getString)
      .calledWith("steam_id_text")
      .thenReturn(steamIdText);

    when(setUserData.execute)
      .calledWith({
        user: {
          id: interaction.user.id,
          steamIdText,
        },
      })
      .thenResolve();

    // When
    await handler(interaction);

    // Then
    expect(setUserData.execute).toHaveBeenCalledWith({
      user: {
        id: interaction.user.id,
        steamIdText,
      },
    });
    expect(interaction.followUp).toHaveBeenCalledWith({
      content: `Your user data has been set successfully!`,
      flags: MessageFlags.Ephemeral,
    });
  });

  describe("error handling", () => {
    it("should handle AbortError and reply with abort message", async () => {
      const { handler, interaction, setUserData } = createHandler();
      const steamIdText = chance.string({ length: 17, pool: "0123456789" });
      interaction.user = mock();
      interaction.user.id = chance.guid();
      when(interaction.options.getString)
        .calledWith("steam_id_text")
        .thenReturn(steamIdText);
      const abortError = new Error("Aborted by user");
      abortError.name = "AbortError";
      when(setUserData.execute)
        .calledWith({
          user: {
            id: interaction.user.id,
            steamIdText,
          },
        })
        .thenReject(abortError);
      await handler(interaction);
      expect(interaction.followUp).toHaveBeenCalledWith({
        content: "Operation was aborted by the user.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("should handle UserError and reply with user error message", async () => {
      const { handler, interaction, setUserData } = createHandler();
      const steamIdText = chance.string({ length: 17, pool: "0123456789" });
      interaction.user = mock();
      interaction.user.id = chance.guid();
      when(interaction.options.getString)
        .calledWith("steam_id_text")
        .thenReturn(steamIdText);
      const userError = new Error("This is a user error");
      userError.name = "UserError";
      when(setUserData.execute)
        .calledWith({
          user: {
            id: interaction.user.id,
            steamIdText,
          },
        })
        .thenReject(userError);
      await handler(interaction);
      expect(interaction.followUp).toHaveBeenCalledWith({
        content: userError.message,
        flags: MessageFlags.Ephemeral,
      });
    });

    it("should handle unknown error and reply with generic error message", async () => {
      const { handler, interaction, setUserData } = createHandler();
      const steamIdText = chance.string({ length: 17, pool: "0123456789" });
      interaction.user = mock();
      interaction.user.id = chance.guid();
      when(interaction.options.getString)
        .calledWith("steam_id_text")
        .thenReturn(steamIdText);
      const genericError = new Error("Something went wrong");
      when(setUserData.execute)
        .calledWith({
          user: {
            id: interaction.user.id,
            steamIdText,
          },
        })
        .thenReject(genericError);
      await handler(interaction);
      expect(interaction.followUp).toHaveBeenCalledWith({
        content: expect.stringContaining("There was an unexpected error running the command"),
        flags: MessageFlags.Ephemeral,
      });
    });
  });

});
