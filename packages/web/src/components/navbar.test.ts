import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import { isInternalAnchorHref, isNavItemActive } from "./navbar";

describe("isInternalAnchorHref", () => {
  it("classifies hash hrefs as internal anchors", () => {
    expect(isInternalAnchorHref("#features")).toBe(true);
  });

  it("classifies non-hash hrefs as not internal anchors", () => {
    expect(isInternalAnchorHref("/docs/")).toBe(false);
    expect(isInternalAnchorHref("https://discord.gg/HfDgMj73cW")).toBe(false);
    expect(isInternalAnchorHref("")).toBe(false);
  });
});

describe("isNavItemActive", () => {
  it("marks the docs link active on the docs page", () => {
    expect(isNavItemActive("/docs/", "docs")).toBe(true);
    expect(isNavItemActive("/docs/", "features")).toBe(false);
  });

  it("marks anchor items active for their matching section", () => {
    expect(isNavItemActive("#features", "features")).toBe(true);
    expect(isNavItemActive("#features", "")).toBe(false);
    expect(isNavItemActive("#features", "docs")).toBe(false);
  });
});
