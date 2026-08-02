// react-markdown is a direct dependency for its `Components` type (and future
// use of the `<Markdown>` component), while rendering is driven by the unified
// pipeline directly so the table of contents can be built from the same tree.
import type { Components } from "react-markdown";
import { Children, cloneElement, isValidElement, type ReactElement } from "react";
import { isHastElementNode } from "@/lib/hast-node";

export function isInternalLink(href: string | undefined): boolean {
  return href?.startsWith("/") === true || href?.startsWith("#") === true;
}

export const docsComponents: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1 className="text-2xl md:text-3xl font-bold text-white mt-0 mb-6 border-b border-white/10 pb-4 scroll-mt-24" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="text-xl font-semibold text-white mt-10 mb-4 scroll-mt-24" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="text-lg font-semibold text-white mt-8 mb-3 scroll-mt-24" {...props} />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="my-4 leading-relaxed text-[#c9d1d9]" {...props} />
  ),
  a: ({ node: _node, href, children, ...props }) => {
    const isInternal = isInternalLink(href);
    return (
      <a
        href={href}
        className="text-accent hover:underline"
        {...(isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: ({ node: _node, ...props }) => (
    <ul className="list-disc pl-6 space-y-2 text-[#c9d1d9]" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="list-decimal pl-6 space-y-2 text-[#c9d1d9]" {...props} />
  ),
  li: ({ node: _node, ...props }) => (
    <li className="my-1" {...props} />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="inline-code font-mono" {...props} />
  ),
  pre: ({ node: _node, children, ...props }) => (
    <pre
      className="bg-[#0a0e14] border border-white/10 rounded-lg p-4 overflow-x-auto my-4"
      {...props}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const tag = isHastElementNode(child.props)
          ? child.props.node.tagName
          : "";
        return tag === "code"
          ? cloneElement(child as ReactElement<{ className?: string }>, {
              className: "bg-transparent p-0 text-sm font-mono text-[#e6edf3]",
            })
          : child;
      })}
    </pre>
  ),
  table: ({ node: _node, children, ...props }) => (
    <div className="overflow-x-auto">
      <table
        className="command-table w-full text-sm text-left border-collapse my-4"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="px-4 py-2 text-left font-semibold" {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="px-4 py-2 border-b border-white/10 text-[#c9d1d9]" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="border-l-4 border-accent/40 bg-white/5 rounded-r-lg px-4 py-2 my-4 text-text-muted"
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="text-white font-semibold" {...props} />
  ),
  em: ({ node: _node, ...props }) => (
    <em className="italic" {...props} />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr className="border-white/10 my-8" {...props} />
  ),
};
