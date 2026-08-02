import type { Metadata } from "next";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DocsSection from "@/components/docs/docs-section";
import DocsToc, { buildToc } from "@/components/docs/docs-toc";
import { loadDocs, renderDocsMarkdown } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation — TF2-QuickServer",
  description:
    "User guide for the TF2-QuickServer Discord bot: commands, scheduling, admin tools, and community rules.",
};

export default function DocsPage() {
  const sections = loadDocs();

  const rendered = sections.map((section) => ({
    slug: section.slug,
    elements: renderDocsMarkdown(section.content),
  }));

  const toc = buildToc(rendered.map((section) => ({ elements: section.elements })));

  const seenIds = new Set<string>();
  for (const entry of toc) {
    if (seenIds.has(entry.id)) {
      throw new Error(
        `Duplicate heading id "${entry.id}" across docs pages; heading text must be unique`,
      );
    }
    seenIds.add(entry.id);
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <a href="/" className="text-text-muted hover:text-accent text-sm">
            ← Back to Home
          </a>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gradient mt-2 mb-1">
            Documentation
          </h1>
          <p className="text-text-muted mb-8">
            User guide for the TF2-QuickServer Discord bot: commands, scheduling,
            admin tools, and community rules.
          </p>

          <div
            className="lg:hidden flex flex-wrap gap-2 mb-8"
            role="navigation"
            aria-label="Jump to section"
          >
            {toc.map((entry) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className="px-3 py-1 rounded-full text-xs font-medium text-text-muted bg-section-bg border border-white/10 hover:text-accent no-underline"
              >
                {entry.text}
              </a>
            ))}
          </div>

          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
            <aside className="hidden lg:block">
              <DocsToc toc={toc} />
            </aside>
            <div className="space-y-16">
              {rendered.map((section) => (
                <DocsSection key={section.slug}>{section.elements}</DocsSection>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
