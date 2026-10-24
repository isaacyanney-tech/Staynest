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
import { HeroWaves } from "./hero-waves";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { PointerSpotlight } from "@/components/motion/pointer-spotlight";
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
  const stats = content.stats.filter((s) => s.label);
  return (
    <section className="hero-band relative isolate overflow-hidden text-white">
      <HeroWaves />
      {/* Keeps the copy readable over the brightest crests. */}
      <div aria-hidden className="hero-scrim pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-32">
        <div className="hero-copy">
          {content.eyebrow && (
            <p className="hero-enter mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-sm font-medium text-white/85 backdrop-blur-sm">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-secondary" />
              </span>
              {content.eyebrow}
            </p>
          )}
          <h1 className="hero-enter hero-title max-w-[16ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.4rem] lg:text-[4rem]" style={{ animationDelay: "80ms" }}>
            {content.heading}
          </h1>
          {content.subheading && (
            <p className="hero-enter mt-6 max-w-xl text-lg leading-relaxed text-white/75" style={{ animationDelay: "160ms" }}>
              {content.subheading}
            </p>
          )}
          <div className="hero-enter mt-9 max-w-2xl" style={{ animationDelay: "240ms" }}>
            <HeroSearch placeholder={content.searchPlaceholder} universities={universities} />
          </div>
          <div className="hero-enter mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ animationDelay: "320ms" }}>
            <Link href={content.primaryCta.href} className="group inline-flex items-center gap-1.5 font-medium text-white">
              <span className="underline decoration-secondary decoration-2 underline-offset-[6px] transition-[text-underline-offset] group-hover:underline-offset-[9px]">
                {content.primaryCta.label}
              </span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
            {content.secondaryCta && (
              <Link href={content.secondaryCta.href} className="font-medium text-white/75 transition-colors hover:text-white">
                {content.secondaryCta.label}
              </Link>
            )}
          </div>
          {stats.length > 0 && (
            <ul className="hero-enter mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-sm text-white/75" style={{ animationDelay: "400ms" }}>
              {stats.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  {s.value ? (
                    <strong className="font-display text-lg text-white">{s.value}</strong>
                  ) : (
                    <ShieldCheck className="size-4 text-secondary" aria-hidden />
                  )}
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hero-art relative mx-auto w-full max-w-xl lg:max-w-none">
          {media ? (
            <figure className="hero-enter relative aspect-[5/4] overflow-hidden rounded-2xl shadow-[0_30px_80px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/15" style={{ animationDelay: "200ms" }}>
              <SafeImage src={media.url} alt={media.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              {media.illustrative && (
                <figcaption className="absolute bottom-3 left-3 rounded-sm bg-surface/90 px-2 py-1 text-xs text-muted">Illustrative photo</figcaption>
              )}
            </figure>
          ) : (
            <div className="hero-enter hero-float" style={{ animationDelay: "200ms" }}>
              <HeroTilt>
                <HeroScene />
              </HeroTilt>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** A section heading whose words rise into place as it scrolls into view. */
function SectionTitle({ children, className }: { children: string; className: string }) {
  return (
    <ScrollReveal mode="enter" effect="rise" stagger={0.06} duration={0.7} baseOpacity={0.15} baseRotation={0} blurStrength={6} containerClassName={className}>
      {children}
    </ScrollReveal>
  );
}

function SectionHeading({ heading, subheading, action }: { heading: string; subheading?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <SectionTitle className="text-3xl font-semibold tracking-[-0.025em] text-brand md:text-[2.125rem]">{heading}</SectionTitle>
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
      <PointerSpotlight />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {chosen.map((u) => (
          <li key={u.slug} className="bg-surface">
            <Link
              href={`/universities/${u.slug}`}
              data-spotlight
              className="spotlight group flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:bg-primary-soft/40"
            >
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight text-brand">{u.shortName}</p>
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
              <li key={step.title} className="reveal group relative border-t-2 border-brand pt-6">
                <span className="absolute -top-3.5 left-0 bg-bg pr-3 font-display text-sm font-semibold text-secondary-ink">
                  0{i + 1}
                </span>
                <Icon className="size-6 text-brand transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:rotate-[-6deg] group-hover:text-secondary-ink" aria-hidden />
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
      <div className="hero-band grid gap-10 rounded-xl px-6 py-12 text-white sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-14 lg:py-16">
        <div>
          <ShieldCheck className="size-8 text-secondary" aria-hidden />
          <SectionTitle className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-white md:text-[2.125rem]">{content.heading}</SectionTitle>
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
          <SectionTitle className="text-3xl font-semibold tracking-[-0.025em] text-brand">{content.heading}</SectionTitle>
          {content.body && <p className="mt-2 text-[1.0625rem] text-muted">{content.body}</p>}
        </div>
        <LinkButton href={content.cta.href} variant="accent" size="lg">
          {content.cta.label}
        </LinkButton>
      </div>
    </section>
  );
}
