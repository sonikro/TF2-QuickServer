import { describe, expect, it } from "vitest";
import { docsComponents, isInternalLink } from "./markdown-components";

describe("isInternalLink", () => {
  it("treats path and fragment hrefs as internal", () => {
    expect(isInternalLink("/docs/")).toBe(true);
    expect(isInternalLink("/")).toBe(true);
    expect(isInternalLink("#using-the-bot")).toBe(true);
  });

  it("treats absolute and empty hrefs as external", () => {
    expect(isInternalLink("https://discord.gg/HfDgMj73cW")).toBe(false);
    expect(isInternalLink("mailto:admin@example.com")).toBe(false);
    expect(isInternalLink("")).toBe(false);
    expect(isInternalLink(undefined)).toBe(false);
  });
});

describe("docsComponents", () => {
  it("maps all expected markdown element types", () => {
    expect(Object.keys(docsComponents).sort()).toEqual(
      [
        "a",
        "blockquote",
        "code",
        "em",
        "h1",
        "h2",
        "h3",
        "hr",
        "li",
        "ol",
        "p",
        "pre",
        "strong",
        "table",
        "td",
        "th",
        "ul",
      ].sort(),
    );
  });
});
