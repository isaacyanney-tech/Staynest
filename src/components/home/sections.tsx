import Link from "next/link";
import { ArrowRight, CalendarCheck, FileCheck2, Search, ShieldCheck } from "lucide-react";
import type { SectionContent } from "@/lib/cms/schemas";
import type { HostelCard as Card, University } from "@/lib/hostels/queries";
import type { MediaRef } from "@/lib/cms/queries";
import { LinkButton } from "@/components/ui/button";
import { HostelCard } from "@/components/hostels/hostel-card";
import { SafeImage } from "@/components/hostels/safe-image";
import { HeroScene } from "./hero-scene";
import { HeroTilt } from "./hero-tilt";
import { HeroSearch } from "./search-form";

export function Hero({
  content,
  universities,
  media,
}: {
  content: SectionContent<"hero">;
  universities: University[];
  media: MediaRef | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-24">
        <div className="animate-fade-up">
          {content.eyebrow && (
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-secondary-ink">
              <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
              {content.eyebrow}
            </p>
          )}
          <h1 className="max-w-[16ch] text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.035em] text-primary sm:text-5xl lg:text-[3.6rem]">
            {content.heading}
          </h1>
          {content.subheading && <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{content.subheading}</p>}
          <div className="mt-8 max-w-2xl">
            <HeroSearch placeholder={content.searchPlaceholder} universities={universities} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={content.primaryCta.href} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              {content.primaryCta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {content.secondaryCta && (
              <Link href={content.secondaryCta.href} className="font-medium text-ink/75 hover:text-primary">
                {content.secondaryCta.label}
              </Link>
            )}
          </div>
          {content.stats.filter((s) => s.label).length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-6 text-sm text-muted">
              {content.stats
                .filter((s) => s.label)
                .map((s) => (
                  <li key={s.label} className="flex items-center gap-2">
                    {s.value ? <strong className="font-display text-lg text-primary">{s.value}</strong> : <ShieldCheck className="size-4 text-secondary-ink" aria-hidden />}
                    {s.label}
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          {media ? (
            <figure className="relative aspect-[5/4] overflow-hidden rounded-xl">
              <SafeImage src={media.url} alt={media.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              {media.illustrative && (
                <figcaption className="absolute bottom-3 left-3 rounded-sm bg-surface/90 px-2 py-1 text-xs text-muted">Illustrative photo</figcaption>
              )}
            </figure>
          ) : (
            <HeroTilt>
              <HeroScene />
            </HeroTilt>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ heading, subheading, action }: { heading: string; subheading?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-[-0.025em] text-primary md:text-[2.125rem]">{heading}</h2>
        {subheading && <p className="mt-2 text-[1.0625rem] text-muted">{subheading}</p>}
      </div>
      {action}
    </div>
  );
}

export function PopularUniversities({ content, universities }: { content: SectionContent<"popular_universities">; universities: University[] }) {
  const chosen = content.universitySlugs.length
    ? content.universitySlugs.map((s) => universities.find((u) => u.slug === s)).filter((u): u is University => Boolean(u))
    : universities.filter((u) => u.isPopular);
  if (chosen.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <SectionHeading heading={content.heading} subheading={content.subheading} />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {chosen.map((u) => (
          <li key={u.slug} className="bg-surface">
            <Link
              href={`/universities/${u.slug}`}
              className="group flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:bg-primary-soft/60"
            >
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight text-primary">{u.shortName}</p>
                <p className="mt-1 text-sm text-ink/80">{u.name}</p>
              </div>
              <p className="flex items-center justify-between text-sm text-muted">
                <span>
                  {u.city} · {u.hostelCount} {u.hostelCount === 1 ? "hostel" : "hostels"}
                </span>
                <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeaturedHostels({ content, hostels }: { content: SectionContent<"featured_hostels">; hostels: Card[] }) {
  if (hostels.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <SectionHeading
        heading={content.heading}
        subheading={content.subheading}
        action={
          <LinkButton href="/hostels" variant="outline" size="sm">
            See all hostels <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        }
      />
      {hostels.some((h) => h.demo) && (
        <p className="-mt-4 mb-6 text-sm text-muted">
          Listings marked <strong className="font-medium text-warning">Illustrative</strong> are sample content and are not real hostels.
        </p>
      )}
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {hostels.map((h) => (
          <HostelCard key={h.id} hostel={h} />
        ))}
      </div>
    </section>
  );
}

const STEP_ICONS = [Search, CalendarCheck, FileCheck2];

export function HowItWorks({ content }: { content: SectionContent<"how_it_works"> }) {
  return (
    <section id="how-it-works" className="scroll-mt-24 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading heading={content.heading} />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {content.steps.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <li key={step.title} className="reveal relative border-t-2 border-primary pt-6">
                <span className="absolute -top-3.5 left-0 bg-bg pr-3 font-display text-sm font-semibold text-secondary-ink">
                  0{i + 1}
                </span>
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function Trust({ content }: { content: SectionContent<"trust"> }) {
  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="grid gap-10 rounded-xl bg-primary px-6 py-12 text-white sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-14 lg:py-16">
        <div>
          <ShieldCheck className="size-8 text-secondary" aria-hidden />
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-white md:text-[2.125rem]">{content.heading}</h2>
          {content.body && <p className="mt-4 text-[1.0625rem] leading-relaxed text-white/75">{content.body}</p>}
          {content.link && (
            <Link href={content.link.href} className="mt-6 inline-flex items-center gap-1.5 font-medium text-white underline decoration-secondary decoration-2 underline-offset-4 hover:decoration-white">
              {content.link.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <ul className="divide-y divide-white/15 border-y border-white/15">
          {content.points.map((p) => (
            <li key={p.title} className="py-5">
              <h3 className="font-sans text-base font-semibold text-white">{p.title}</h3>
              <p className="mt-1 text-white/70">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function OwnerCta({ content }: { content: SectionContent<"cta"> }) {
  return (
    <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col gap-6 border-y border-line py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-primary">{content.heading}</h2>
          {content.body && <p className="mt-2 text-[1.0625rem] text-muted">{content.body}</p>}
        </div>
        <LinkButton href={content.cta.href} variant="accent" size="lg">
          {content.cta.label}
        </LinkButton>
      </div>
    </section>
  );
}
