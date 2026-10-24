import { Search } from "lucide-react";
import type { University } from "@/lib/hostels/queries";

/** Plain GET form so search works before JavaScript loads. */
export function HeroSearch({ placeholder, universities }: { placeholder: string; universities: University[] }) {
  return (
    <form action="/hostels" role="search" aria-label="Find a hostel" className="rounded-lg border border-line-strong bg-surface p-2 shadow-raised">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Hostel, area or keyword</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder={placeholder || "Search hostels"}
            className="h-12 w-full rounded-md bg-transparent pl-9 pr-3 text-base text-ink placeholder:text-muted focus:outline-none focus-visible:ring-3 focus-visible:ring-brand/15"
          />
        </label>
        <label className="sm:w-44">
          <span className="sr-only">University</span>
          <select
            name="university"
            defaultValue=""
            className="h-12 w-full rounded-md border border-line bg-sunken px-3 text-[0.9375rem] text-ink focus:outline-none focus-visible:ring-3 focus-visible:ring-brand/15"
          >
            <option value="">Any university</option>
            {universities.map((u) => (
              <option key={u.slug} value={u.slug}>
                {u.shortName} · {u.city}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-12 rounded-md bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Search
        </button>
      </div>
    </form>
  );
}
