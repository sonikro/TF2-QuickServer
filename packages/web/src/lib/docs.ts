import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { docsComponents } from "@/components/docs/markdown-components";

export interface DocsSection {
  slug: string;
  title: string;
  content: string;
}

const DOC_SLUGS = [
  "home",
  "using-the-bot",
  "admin-commands",
  "rules",
  "scheduling",
] as const;

export function resolveDocsDir(): string {
  const cwd = process.cwd();
  const candidates = [join(cwd, "docs"), join(cwd, "packages/web/docs")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Could not locate the docs directory. Tried: ${candidates.join(", ")}`,
  );
}

function extractTitle(content: string, slug: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (!match) {
    throw new Error(`Docs file "${slug}.md" is missing a "# Title" heading`);
  }
  return match[1].trim();
}

export function loadDocs(): DocsSection[] {
  const docsDir = resolveDocsDir();
  return DOC_SLUGS.map((slug) => {
    const content = readFileSync(join(docsDir, `${slug}.md`), "utf8");
    return { slug, title: extractTitle(content, slug), content };
  });
}

export function renderDocsMarkdown(content: string): ReactElement {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug);
  const tree = processor.runSync(processor.parse(content));
  return toJsxRuntime(tree, {
    Fragment,
    components: docsComponents,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  });
}
