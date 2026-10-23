import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6" aria-busy="true" aria-label="Loading hostel">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-8 h-10 w-2/3 max-w-lg" />
      <Skeleton className="mt-3 h-5 w-1/2 max-w-sm" />
      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-xl md:aspect-[21/9]" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
