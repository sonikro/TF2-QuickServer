import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import { TESTIMONIALS, toParagraphs } from "./testimonials";

describe("toParagraphs", () => {
  it("wraps a single string in a one-element array", () => {
    const paragraphs = toParagraphs("A single paragraph.");

    expect(paragraphs).toEqual(["A single paragraph."]);
    expect(paragraphs).toHaveLength(1);
  });

  it("returns an array of paragraphs with order and length intact", () => {
    const paragraphs = toParagraphs([
      "First paragraph.",
      "Second paragraph.",
      "Third paragraph.",
    ]);

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third paragraph.",
    ]);
  });
});

describe("TESTIMONIALS", () => {
  it("contains a single pepito entry with three non-empty paragraphs", () => {
    const pepitoEntries = TESTIMONIALS.filter(
      (entry) => entry.player === "pepito",
    );

    expect(pepitoEntries).toHaveLength(1);

    const [pepito] = pepitoEntries;
    const paragraphs = toParagraphs(pepito.testimonial);

    expect(pepito.title).toBe("Founder of Vanguard.tf");
    expect(pepito.avatar).toBe("/avatars/pepito.jpg");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.every((paragraph) => paragraph.trim().length > 0)).toBe(
      true,
    );
  });

  it("reproduces pepito's testimonial verbatim, paragraph by paragraph", () => {
    const pepito = TESTIMONIALS.find((entry) => entry.player === "pepito");

    expect(pepito).toBeDefined();
    expect(toParagraphs(pepito?.testimonial ?? [])).toEqual([
      "When we created Vanguard.tf, a mix (PUG) community built by and for the South American TF2 scene, one of our biggest challenges was finding a reliable and sustainable way to host our games. Traditional dedicated servers were expensive and often plagued by technical issues, making it difficult to provide a consistent experience for our players.",
      "Our partnership with QuickServer has been instrumental in overcoming these challenges. Through our integration, Vanguard.tf can launch games on demand, leveraging QuickServer's reliable service and exclusive features to deliver a smoother, more accessible experience for the community. This collaboration has become an important part of how Vanguard.tf operates, allowing us to focus on what matters most: bringing players together and growing the scene.",
      "On behalf of the entire community, we'd like to thank QuickServer and, especially, Sonikro for the partnership, ongoing support, and contribution to the growth of TF2 in South America!",
    ]);
  });

  it("uses unique player names and populates every field", () => {
    const players = TESTIMONIALS.map((entry) => entry.player);
    const uniquePlayers = new Set(players);

    expect(uniquePlayers.size).toBe(TESTIMONIALS.length);
    expect(
      TESTIMONIALS.every(
        (entry) =>
          entry.player.trim().length > 0 &&
          entry.title.trim().length > 0 &&
          entry.avatar.trim().length > 0,
      ),
    ).toBe(true);
  });

  it("points every avatar at a local /avatars path", () => {
    expect(
      TESTIMONIALS.every((entry) => entry.avatar.startsWith("/avatars/")),
    ).toBe(true);
  });

  it("references an avatar file that exists under packages/web/public", () => {
    const missingAvatars = TESTIMONIALS.filter(
      (entry) =>
        !existsSync(new URL(`../../public${entry.avatar}`, import.meta.url)),
    );

    expect(missingAvatars).toEqual([]);
  });
});
