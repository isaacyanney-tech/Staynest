import Link from "next/link";
import { Wordmark } from "@/components/site/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Link href="/" className="rounded-md">
        <Wordmark />
        <span className="sr-only">Home</span>
      </Link>
      <p className="mt-12 font-display text-6xl font-semibold tracking-tight text-brand/20">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-brand">We could not find that page</h1>
      <p className="mt-2 max-w-md text-muted">The listing may have been removed, or the link may be wrong.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/hostels">Browse hostels</LinkButton>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
    </main>
  );
}
