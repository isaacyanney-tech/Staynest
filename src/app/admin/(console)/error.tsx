"use client";
import { Button, LinkButton } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="mt-2 text-muted">Nothing was changed. Try again, or go back to the overview.</p>
      {digest && <p className="mt-2 text-xs text-muted">Reference for the error log: {digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton href="/admin" variant="outline">
          Overview
        </LinkButton>
      </div>
    </div>
  );
}
