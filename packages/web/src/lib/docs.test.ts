import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildToc } from "../components/docs/docs-toc";
import { loadDocs, renderDocsMarkdown, resolveDocsDir } from "./docs";

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeDocsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "docs-test-"));
  tempDirs.push(dir);
  const docsDir = join(dir, "docs");
  mkdirSync(docsDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(docsDir, name), content, "utf8");
  }
  return dir;
}

const DOC_FILES: Record<string, string> = {
  "home.md": "# Home\n\nLanding content.",
  "using-the-bot.md": "# Using the Bot\n\nGuide content.",
  "admin-commands.md": "# Admin Commands\n\nAdmin content.",
  "rules.md": "# Rules\n\nRule content.",
  "scheduling.md": "# Scheduling\n\nSchedule content.",
};

describe("resolveDocsDir", () => {
  it("returns <cwd>/docs when it exists", () => {
    const dir = makeDocsDir(DOC_FILES);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    expect(resolveDocsDir()).toBe(join(dir, "docs"));
  });

  it("falls back to <cwd>/packages/web/docs", () => {
    const dir = mkdtempSync(join(tmpdir(), "docs-fallback-"));
    tempDirs.push(dir);
    const webDocs = join(dir, "packages", "web", "docs");
    mkdirSync(webDocs, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    expect(resolveDocsDir()).toBe(webDocs);
  });

  it("throws a clear error when no docs directory is found", () => {
    const dir = mkdtempSync(join(tmpdir(), "docs-missing-"));
    tempDirs.push(dir);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    expect(() => resolveDocsDir()).toThrow(/Could not locate the docs directory/);
  });
});

describe("loadDocs", () => {
  it("returns the five sections in fixed order", () => {
    const dir = makeDocsDir(DOC_FILES);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const sections = loadDocs();
    expect(sections.map((section) => section.slug)).toEqual([
      "home",
      "using-the-bot",
      "admin-commands",
      "rules",
      "scheduling",
    ]);
  });

  it("extracts titles from the first # heading of each file", () => {
    const dir = makeDocsDir(DOC_FILES);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const sections = loadDocs();
    expect(sections.map((section) => section.title)).toEqual([
      "Home",
      "Using the Bot",
      "Admin Commands",
      "Rules",
      "Scheduling",
    ]);
  });

  it("preserves the full file content", () => {
    const dir = makeDocsDir(DOC_FILES);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const sections = loadDocs();
    expect(sections[0].content).toBe("# Home\n\nLanding content.");
  });

  it("throws when the docs directory is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "docs-missing-"));
    tempDirs.push(dir);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    expect(() => loadDocs()).toThrow(/Could not locate the docs directory/);
  });

  it("throws a clear error when a file is missing its # Title heading", () => {
    const dir = makeDocsDir({ "home.md": "No heading here" });
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    expect(() => loadDocs()).toThrow(
      /Docs file "home\.md" is missing a "# Title" heading/,
    );
  });
});

describe("renderDocsMarkdown", () => {
  it("renders markdown into elements with rehype-slug heading ids", () => {
    const elements = renderDocsMarkdown(
      "## Hello World\n\nSome text.\n\n### Sub Section",
    );
    const toc = buildToc([{ elements }]);
    expect(toc).toEqual([
      { id: "hello-world", text: "Hello World", level: 2 },
      { id: "sub-section", text: "Sub Section", level: 3 },
    ]);
  });

  it("produces a tree buildToc can traverse for real docs content", () => {
    const elements = renderDocsMarkdown(DOC_FILES["scheduling.md"]);
    expect(buildToc([{ elements }])[0]).toEqual({
      id: "scheduling",
      text: "Scheduling",
      level: 1,
    });
  });
});
