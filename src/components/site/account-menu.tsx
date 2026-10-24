"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

export type AccountLink = { href: string; label: string };

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return email.slice(0, 1).toUpperCase() || "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** The signed-in account button in the desktop header, with its links and Sign out. */
export function AccountMenu({ name, email, links }: { name: string; email: string; links: AccountLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const firstName = name.trim().split(/\s+/)[0] || "Account";
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
      >
        <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {initials(name, email)}
        </span>
        {firstName}
        <span className="sr-only">: account menu</span>
        <ChevronDown aria-hidden className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-line bg-surface p-1.5 shadow-overlay"
      >
        <div className="border-b border-line px-3 pb-2.5 pt-1.5">
          <p className="truncate text-sm font-semibold">{name || "Your account"}</p>
          <p className="truncate text-xs text-ink/70">{email}</p>
        </div>
        <AccountActions links={links} />
      </div>
    </div>
  );
}

/** The account links and Sign out, used in the desktop menu and the mobile panel. */
export function AccountActions({ links, stacked = false }: { links: AccountLink[]; stacked?: boolean }) {
  const item = stacked
    ? "flex w-full items-center gap-2 py-3 text-base font-medium text-ink"
    : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-sunken";
  return (
    <ul className={stacked ? "divide-y divide-line" : "pt-1.5"}>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={item}>
            {l.label}
          </Link>
        </li>
      ))}
      <li className={stacked ? "" : "mt-1 border-t border-line pt-1"}>
        <form action={signOut}>
          <button type="submit" className={cn(item, "text-danger", !stacked && "hover:bg-danger-soft")}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </li>
    </ul>
  );
}
