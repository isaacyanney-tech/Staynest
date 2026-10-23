import type { Metadata } from "next";
import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { getUniversities, PAGE_SIZE, searchHostels } from "@/lib/hostels/queries";
import { parseSearchParams, toQueryString, type HostelSearch } from "@/lib/hostels/search-params";
import { FilterPanel } from "@/components/hostels/filter-panel";
import { SortSelect } from "@/components/hostels/sort-select";
import { HostelCard, HostelCardSkeleton } from "@/components/hostels/hostel-card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Find a hostel",
  description: "Search student hostels near Ghanaian universities by price, room size, amenities and distance to campus.",
};

export default function HostelsPage({ searchParams }: PageProps<"/hostels">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 md:pt-10">
      <h1 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">Find a hostel</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/hostels">["searchParams"] }) {
  const filters = parseSearchParams(await searchParams);
  const [universities, result] = await Promise.all([getUniversities(), searchHostels(filters).catch(() => null)]);
  const university = universities.find((u) => u.slug === filters.university);
  const activeCount = countActive(filters);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {/* Collapsed behind a disclosure on small screens. */}
        <details className="group rounded-lg border border-line bg-surface lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
              {activeCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{activeCount}</span>}
            </span>
            <span className="text-sm text-muted group-open:hidden">Show</span>
            <span className="hidden text-sm text-muted group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-line px-4 py-4">
            <FilterPanel filters={filters} universities={universities} idPrefix="m-" />
          </div>
        </details>
        <div className="hidden rounded-lg border border-line bg-surface p-5 lg:block">
          <FilterPanel filters={filters} universities={universities} idPrefix="d-" />
        </div>
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <h2 id="results-heading" className="font-sans text-[0.9375rem] font-normal tracking-normal text-muted" aria-live="polite">
            {result ? (
              <>
                <span className="font-semibold text-ink">{result.total}</span> {result.total === 1 ? "hostel" : "hostels"}
                {university && <> near {university.shortName}</>}
                {filters.q && <> matching “{filters.q}”</>}
              </>
            ) : (
              "Search unavailable"
            )}
          </h2>
          <SortSelect value={filters.sort} />
        </div>

        {!result ? (
          <Notice tone="danger" title="We could not load hostels" className="mt-6">
            Please refresh the page in a moment. If this keeps happening, contact us.
          </Notice>
        ) : result.items.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="No hostels match these filters"
            action={
              <LinkButton href="/hostels" variant="outline">
                Clear filters
              </LinkButton>
            }
          >
            Try a wider price range, fewer amenities, or a different university.
          </EmptyState>
        ) : (
          <>
            {result.items.some((h) => h.demo) && (
              <p className="mt-4 text-sm text-muted">
                Listings marked <strong className="font-medium text-warning">Illustrative</strong> are samples that show how StayNest works. They are not real hostels and cannot be booked or inspected.
              </p>
            )}
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((hostel, i) => (
                <li key={hostel.id}>
                  <HostelCard hostel={hostel} priority={i < 3} />
                </li>
              ))}
            </ul>
            <div className="mt-12">
              <Pagination
                page={filters.page}
                pages={Math.ceil(result.total / PAGE_SIZE)}
                hrefFor={(page) => `/hostels${toQueryString({ ...filters, page })}`}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function countActive(f: HostelSearch) {
  return [f.q, f.university, f.min, f.max, f.occupancy, f.gender, f.available || undefined, f.verified || undefined].filter((v) => v != null && v !== "").length + f.amenities.length;
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-10" aria-busy="true" aria-label="Loading hostels">
      <div className="skeleton hidden h-[36rem] rounded-lg lg:block" />
      <div>
        <div className="skeleton h-9 rounded-md" />
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <HostelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
