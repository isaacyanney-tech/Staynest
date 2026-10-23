"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";

type Item = { id: string; label: string; href: string };

export function MobileNav({ items, account }: { items: Item[]; account: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-sunken"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        // Following any link inside the panel closes it.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface px-4 pb-6 pt-2 shadow-overlay"
      >
        <nav aria-label="Mobile">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="block py-3 text-base font-medium text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4">{account}</div>
      </div>
    </div>
  );
}
