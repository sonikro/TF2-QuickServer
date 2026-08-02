import { describe, expect, it } from "vitest";
import { isHastElementNode } from "./hast-node";

describe("isHastElementNode", () => {
  it("accepts an object carrying a hast element node", () => {
    expect(isHastElementNode({ node: { tagName: "code" } })).toBe(true);
    expect(
      isHastElementNode({ node: { tagName: "h2", properties: {} } }),
    ).toBe(true);
  });

  it("rejects values without a hast element node", () => {
    expect(isHastElementNode(undefined)).toBe(false);
    expect(isHastElementNode(null)).toBe(false);
    expect(isHastElementNode("code")).toBe(false);
    expect(isHastElementNode(42)).toBe(false);
    expect(isHastElementNode({})).toBe(false);
    expect(isHastElementNode({ node: null })).toBe(false);
    expect(isHastElementNode({ node: {} })).toBe(false);
    expect(isHastElementNode({ node: { tagName: 42 } })).toBe(false);
    expect(isHastElementNode([])).toBe(false);
  });
});
