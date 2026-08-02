import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { isHastElementNode } from "@/lib/hast-node";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return flattenText(children);
  }
  return "";
}

export function buildToc(renderedSections: { elements: ReactNode }[]): TocEntry[] {
  const entries: TocEntry[] = [];

  const visit = (node: ReactNode): void => {
    for (const child of Children.toArray(node)) {
      if (!isValidElement(child)) continue;
      const props = child.props as {
        id?: unknown;
        children?: ReactNode;
        node?: unknown;
      };
      if (typeof props.id === "string" && props.id !== "") {
        const tag =
          typeof child.type === "string"
            ? child.type
            : isHastElementNode(props)
              ? props.node.tagName
              : "";
        const match = /^h([1-6])$/.exec(tag);
        if (match) {
          entries.push({
            id: props.id,
            text: flattenText(child),
            level: Number(match[1]),
          });
        }
      }
      visit(props.children);
    }
  };

  for (const section of renderedSections) {
    visit(section.elements);
  }

  return entries;
}

export default function DocsToc({ toc }: { toc: TocEntry[] }) {
  return (
    <nav
      aria-label="Table of contents"
      className="bg-section-bg border border-white/10 rounded-xl p-6 lg:sticky lg:top-24"
    >
      <ul className="list-none p-0 m-0 space-y-2">
        {toc.map((entry) => (
          <li key={entry.id} style={{ paddingLeft: `${(entry.level - 1) * 12}px` }}>
            <a
              href={`#${entry.id}`}
              className="text-text-muted hover:text-accent no-underline text-sm block transition-colors"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
