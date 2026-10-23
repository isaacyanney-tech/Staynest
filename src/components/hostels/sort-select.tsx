"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SORTS } from "@/lib/hostels/search-params";
import { Select } from "@/components/ui/field";

/** Changes the sort order in place, keeping every other filter. */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="shrink-0 text-sm text-muted">
        Sort by
      </label>
      <Select
        id="sort"
        value={value}
        aria-busy={pending}
        className="h-9 w-auto min-w-44 text-sm"
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "recommended") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          const qs = next.toString();
          start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
        }}
      >
        {Object.entries(SORTS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
