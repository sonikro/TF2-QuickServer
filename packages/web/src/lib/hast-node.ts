import type { Element } from "hast";

/**
 * react-markdown renders with `passNode: true`, so every rendered React
 * element carries the original hast node as `props.node`. That prop is not
 * part of the element's typed props, so this guard narrows the opaque value
 * to the hast `Element` type. The underlying `tagName` is needed because the
 * React element type can be a component wrapper rather than the literal tag.
 */
export function isHastElementNode(value: unknown): value is { node: Element } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const node = (value as { node?: unknown }).node;
  if (typeof node !== "object" || node === null) {
    return false;
  }
  return typeof (node as { tagName?: unknown }).tagName === "string";
}
