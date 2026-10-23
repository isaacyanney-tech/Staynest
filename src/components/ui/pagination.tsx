import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Previous/next links with a page count; hrefFor builds each page's URL. */
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  const link = "inline-flex h-10 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium hover:border-primary hover:text-primary";
  const off = "pointer-events-none opacity-45";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <Link href={hrefFor(page - 1)} className={cn(link, page <= 1 && off)} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} rel="prev">
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Link>
      <p className="text-sm text-muted">
        Page <span className="font-medium text-ink">{page}</span> of {pages}
      </p>
      <Link href={hrefFor(page + 1)} className={cn(link, page >= pages && off)} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} rel="next">
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
