import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, MapPin } from "lucide-react";
import { getUniversities, searchHostels } from "@/lib/hostels/queries";
import { parseSearchParams } from "@/lib/hostels/search-params";
import { formatMoney } from "@/lib/format";
import { HostelCard } from "@/components/hostels/hostel-card";
import { EmptyState } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/button";

async function load(slug: string) {
  const universities = await getUniversities();
  return universities.find((u) => u.slug === slug) ?? null;
}

// Universities change rarely, so every campus page is built ahead of time with
// its title and description in the document head. Cache Components needs at
// least one entry, so a build with no universities yet prerenders a 404.
export async function generateStaticParams() {
  const slugs = (await getUniversities()).map((u) => ({ slug: u.slug }));
  return slugs.length ? slugs : [{ slug: "none" }];
}

export async function generateMetadata({ params }: PageProps<"/universities/[slug]">): Promise<Metadata> {
  const university = await load((await params).slug);
  if (!university) return { title: "University not found" };
  return {
    title: `Student hostels near ${university.shortName}`,
    description: `Compare hostels near ${university.name} in ${university.city}: prices, rooms available, distance to campus and verified listings.`,
    alternates: { canonical: `/universities/${university.slug}` },
  };
}

export default async function UniversityPage({ params }: PageProps<"/universities/[slug]">) {
  const university = await load((await params).slug);
  if (!university) notFound();
  const filters = parseSearchParams({ university: university.slug });
  const { items, total } = await searchHostels(filters);
  const real = items.filter((h) => !h.demo);
  const prices = real.map((h) => h.priceFrom).filter((p): p is number => p !== null);
  const areas = [...new Set(items.map((h) => h.area).filter(Boolean))].slice(0, 6);
  const searchHref = `/hostels?university=${university.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
      <Link href="/universities" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand">
        <ChevronLeft className="size-4" aria-hidden />
        All universities
      </Link>
      <header className="mt-6 max-w-3xl">
        <p className="flex items-center gap-1.5 text-sm font-medium text-secondary-ink">
          <MapPin className="size-4" aria-hidden />
          {university.city}
          {university.region && <>, {university.region}</>}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand md:text-4xl">Student hostels near {university.shortName}</h1>
        <p className="mt-3 text-lg text-ink/80">{university.description || university.name}</p>
      </header>

      <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        <div className="bg-surface p-4">
          <dt className="text-sm text-muted">Listed hostels</dt>
          <dd className="mt-1 text-2xl font-semibold">{total}</dd>
        </div>
        <div className="bg-surface p-4">
          <dt className="text-sm text-muted">Lowest price listed</dt>
          <dd className="mt-1 text-2xl font-semibold">{prices.length ? formatMoney(Math.min(...prices)) : "None yet"}</dd>
        </div>
        <div className="col-span-2 bg-surface p-4 sm:col-span-1">
          <dt className="text-sm text-muted">Areas</dt>
          <dd className="mt-1 font-medium">{areas.length ? areas.join(", ") : "None yet"}</dd>
        </div>
      </dl>
      {real.length !== items.length && (
        <p className="mt-3 text-sm text-muted">Sample listings marked Illustrative are not counted in the lowest price.</p>
      )}

      <section aria-labelledby="hostels-heading" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="hostels-heading" className="text-2xl font-semibold tracking-tight">
            Hostels with rooms near campus
          </h2>
          {total > 0 && (
            <Link href={searchHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              Filter by price, room size and amenities <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState className="mt-6" title={`No hostels near ${university.shortName} yet`} action={<LinkButton href="/hostels">Browse all hostels</LinkButton>}>
            Owners are adding listings. Check back soon, or look at hostels near other campuses.
          </EmptyState>
        ) : (
          <>
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((h, i) => (
                <li key={h.id}>
                  <HostelCard hostel={h} priority={i < 3} />
                </li>
              ))}
            </ul>
            {total > items.length && (
              <div className="mt-10 text-center">
                <LinkButton href={searchHref} variant="outline">
                  See all {total} hostels near {university.shortName}
                </LinkButton>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
