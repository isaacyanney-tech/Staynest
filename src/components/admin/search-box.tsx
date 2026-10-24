import { Search } from "lucide-react";

/** A plain GET form, so searches are linkable and work without JavaScript. */
export function SearchBox({ action, label, defaultValue, hidden = {} }: { action: string; label: string; defaultValue?: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action={action} method="get" role="search" className="flex max-w-md gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="admin-search" className="sr-only">
        {label}
      </label>
      <input
        id="admin-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={label}
        className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 text-[0.9375rem] placeholder:text-ink/60 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15"
      />
      <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium hover:border-brand hover:text-brand">
        <Search className="size-4" aria-hidden />
        Search
      </button>
    </form>
  );
}
