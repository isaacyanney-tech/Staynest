import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUniversities } from "@/lib/hostels/queries";
import { slugify } from "@/lib/format";

export const metadata: Metadata = {
  title: "Hostels by university",
  description: "Find student hostels near universities in Ghana, grouped by campus.",
};

export default async function UniversitiesPage() {
  const universities = await getUniversities();
  const byRegion = new Map<string, typeof universities>();
  for (const u of universities) {
    const key = u.region || u.city;
    byRegion.set(key, [...(byRegion.get(key) ?? []), u]);
  }
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 md:pt-10">
      <h1 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">Hostels by university</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink/80">Pick your campus to see hostels nearby, with prices and walking distance on every listing.</p>
      {[...byRegion.entries()].map(([region, list]) => (
        <section key={region} aria-labelledby={`region-${slugify(region)}`} className="mt-10">
          <h2 id={`region-${slugify(region)}`} className="text-xl font-semibold">
            {region}
          </h2>
          <ul className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {list.map((u) => (
              <li key={u.slug} className="bg-surface">
                <Link href={`/universities/${u.slug}`} className="group flex h-full flex-col justify-between gap-4 p-5 transition-colors hover:bg-primary-soft/60">
                  <div>
                    <p className="font-display text-xl font-semibold tracking-tight text-primary">{u.shortName}</p>
                    <p className="mt-1 text-sm text-ink/80">{u.name}</p>
                  </div>
                  <p className="flex items-center justify-between text-sm text-ink/70">
                    <span>
                      {u.city} · {u.hostelCount} {u.hostelCount === 1 ? "hostel" : "hostels"}
                    </span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
