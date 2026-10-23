"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Item = { id: string; label: string; href: string };

/** Desktop navigation with an animated underline on the current section. */
export function NavLinks({ items }: { items: Item[] }) {
  return <NavList items={items} pathname={usePathname()} />;
}

/** The links themselves; with no pathname (while prerendering) nothing is marked current. */
export function NavList({ items, pathname }: { items: Item[]; pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const path = item.href.split(/[?#]/)[0];
        const active = pathname != null && path !== "/" && pathname.startsWith(path);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-[0.9375rem] font-medium text-ink/80 transition-colors hover:text-primary",
                "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-secondary after:transition-transform after:duration-200 hover:after:scale-x-100",
                active && "text-primary after:scale-x-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
