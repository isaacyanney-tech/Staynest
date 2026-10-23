"use client";
import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-primary">Something went wrong</h1>
      <p className="mt-2 text-muted">We could not load this page. Please try again in a moment.</p>
      {digest && <p className="mt-2 text-xs text-muted">Reference: {digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
    </div>
  );
}
