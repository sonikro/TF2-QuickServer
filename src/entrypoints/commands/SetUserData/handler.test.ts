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
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `Your user data has been set successfully!`,
      flags: MessageFlags.Ephemeral,
    });
  });
});
