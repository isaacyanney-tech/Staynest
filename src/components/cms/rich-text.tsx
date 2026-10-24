import Link from "next/link";
import type { ReactNode } from "react";

// Renders the small Markdown subset the CMS supports: paragraphs, "## " and
// "### " headings, "- " lists, **bold** and [links](/path). Everything else is
// plain text, so administrators cannot inject HTML or scripts.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const safe = /^\/(?!\/)/.test(href) || /^https:\/\//.test(href) || /^mailto:/.test(href);
      if (!safe) out.push(m[2]);
      else if (href.startsWith("/")) out.push(<Link key={`${keyBase}-${i++}`} href={href}>{m[2]}</Link>);
      else out.push(<a key={`${keyBase}-${i++}`} href={href} rel="noopener noreferrer">{m[2]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-[1.0625rem] leading-relaxed text-ink/90 [&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2">
      {blocks.map((block, n) => {
        const key = `b${n}`;
        if (block.startsWith("### ")) return <h3 key={key} className="pt-2 text-xl font-semibold text-ink">{inline(block.slice(4), key)}</h3>;
        if (block.startsWith("## ")) return <h2 key={key} className="pt-4 text-2xl font-semibold text-brand">{inline(block.slice(3), key)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-secondary">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${key}-${j}`)}</li>)}
            </ul>
          );
        }
        return <p key={key}>{inline(lines.join(" "), key)}</p>;
      })}
    </div>
  );
}
