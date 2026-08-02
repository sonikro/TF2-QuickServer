import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { buildToc, flattenText } from "./docs-toc";

function Wrapper(): null {
  return null;
}

type WrapperProps = { id: string; node: { tagName: string } };

describe("buildToc", () => {
  it("collects a single heading", () => {
    const elements = createElement("h2", { id: "usage" }, "Usage");
    expect(buildToc([{ elements }])).toEqual([
      { id: "usage", text: "Usage", level: 2 },
    ]);
  });

  it("collects nested h2 and h3 headings in document order", () => {
    const elements = createElement(
      "div",
      null,
      createElement("h2", { id: "overview" }, "Overview"),
      createElement(
        "div",
        null,
        createElement("h3", { id: "details" }, "Details"),
        createElement("h3", { id: "more" }, "More"),
      ),
      createElement("h2", { id: "limits" }, "Limits"),
    );
    expect(buildToc([{ elements }])).toEqual([
      { id: "overview", text: "Overview", level: 2 },
      { id: "details", text: "Details", level: 3 },
      { id: "more", text: "More", level: 3 },
      { id: "limits", text: "Limits", level: 2 },
    ]);
  });

  it("returns an empty list for empty children", () => {
    expect(buildToc([])).toEqual([]);
    expect(buildToc([{ elements: null }])).toEqual([]);
    expect(buildToc([{ elements: createElement("p", null, "text") }])).toEqual(
      [],
    );
  });

  it("ignores elements without an id and non-heading elements with an id", () => {
    const elements = createElement(
      "div",
      null,
      createElement("h2", null, "No id"),
      createElement("p", { id: "paragraph" }, "Paragraph"),
    );
    expect(buildToc([{ elements }])).toEqual([]);
  });

  it("uses the hast node tagName for non-string element types", () => {
    const elements = createElement(
      "div",
      null,
      createElement(
        Wrapper,
        { id: "wrapped", node: { tagName: "h3" } } as WrapperProps,
        "Wrapped",
      ),
    );
    expect(buildToc([{ elements }])).toEqual([
      { id: "wrapped", text: "Wrapped", level: 3 },
    ]);
  });
});

describe("flattenText", () => {
  it("flattens strings and numbers", () => {
    expect(flattenText("hello")).toBe("hello");
    expect(flattenText(42)).toBe("42");
  });

  it("flattens nested elements and arrays", () => {
    const elements = createElement(
      "p",
      null,
      "Hello ",
      createElement("strong", null, "world"),
      "!",
    );
    expect(flattenText(elements)).toBe("Hello world!");
    expect(flattenText(["a", createElement("em", null, "b"), "c"])).toBe("abc");
  });

  it("returns an empty string for non-text nodes", () => {
    expect(flattenText(null)).toBe("");
    expect(flattenText(undefined)).toBe("");
    expect(flattenText(true)).toBe("");
    expect(flattenText(BigInt(42))).toBe("");
  });
});
