import { cn } from "@/lib/cn";

/** StayNest mark: a roofline over a woven nest, with one lit window. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <path d="M4 15.5 16 6l12 9.5" fill="none" stroke="var(--brand-primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 18.5c2.2 5.6 6.1 8 9.5 8s7.3-2.4 9.5-8" fill="none" stroke="var(--brand-primary)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9.6 21.2c1.9 1.6 4 2.4 6.4 2.4s4.5-.8 6.4-2.4" fill="none" stroke="var(--brand-primary)" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="13.6" y="13" width="4.8" height="4.8" rx="1" fill="var(--brand-secondary)" />
    </svg>
  );
}

export function Wordmark({ name = "StayNest", logoUrl, className }: { name?: string; logoUrl?: string | null; className?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded logo of unknown dimensions
    return <img src={logoUrl} alt={name} className={cn("h-8 w-auto", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[1.3rem] font-semibold tracking-[-0.03em] text-primary">{name}</span>
    </span>
  );
}
