"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "./nav-items";

/** Highlights the current section; rendered inside Suspense with a static fallback. */
export function AdminNav() {
  const pathname = usePathname();
  return <AdminNavList current={pathname} />;
}

export function AdminNavList({ current }: { current?: string }) {
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ADMIN_NAV.map((item) => {
        const active = current !== undefined && (item.href === "/admin" ? current === "/admin" : current.startsWith(item.href));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink/75 transition-colors hover:bg-sunken hover:text-ink",
                active && "bg-primary-soft text-brand hover:bg-primary-soft hover:text-brand",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
