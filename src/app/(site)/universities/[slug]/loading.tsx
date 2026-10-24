import { Skeleton } from "@/components/ui/states";

// Also the Suspense boundary that lets campus pages added after a build render
// on demand; without it the page cannot be regenerated once its data changes.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6" aria-busy="true" aria-label="Loading university">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-8 h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-2/3 max-w-lg" />
      <Skeleton className="mt-3 h-5 w-1/2 max-w-md" />
      <Skeleton className="mt-8 h-24 w-full max-w-3xl" />
      <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
      </div>
    </div>
  );
}
