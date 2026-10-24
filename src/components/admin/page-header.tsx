import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-brand">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Tab-like filter links that keep the state in the URL. */
export function FilterTabs({ items, label }: { items: { href: string; label: string; count?: number; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="mt-6 overflow-x-auto border-b border-line">
      <ul className="flex gap-1 text-sm font-medium">
        {items.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={
                t.active
                  ? "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-brand px-3 py-2.5 text-brand"
                  : "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-ink/70 hover:text-ink"
              }
            >
              {t.label}
              {t.count !== undefined && <span className="rounded-sm bg-sunken px-1.5 text-xs text-ink/75">{t.count}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
