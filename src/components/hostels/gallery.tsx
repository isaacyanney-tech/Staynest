"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { Photo } from "@/lib/hostels/queries";
import { cn } from "@/lib/cn";
import { SafeImage } from "./safe-image";

/** Photo grid that opens a keyboard-navigable lightbox in a native <dialog>. */
export function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [photos.length]);

  if (photos.length === 0) {
    return <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-sunken text-ink/70">No photos yet</div>;
  }

  const current = photos[index];
  const rest = photos.slice(1, 5);

  return (
    <>
      <div className={cn("grid gap-2 overflow-hidden rounded-xl", rest.length > 0 && "md:grid-cols-[2fr_1fr]")}>
        <button type="button" onClick={() => open(0)} className="group relative aspect-[4/3] overflow-hidden bg-sunken md:aspect-auto md:min-h-[26rem]">
          <SafeImage src={photos[0].url} alt={photos[0].alt} fill priority sizes="(min-width: 768px) 60vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-ink shadow-raised">
            <Expand className="size-3.5" aria-hidden />
            View {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        </button>
        {rest.length > 0 && (
          <div className="hidden grid-cols-2 gap-2 md:grid">
            {rest.map((p, i) => (
              <button key={p.url + i} type="button" onClick={() => open(i + 1)} className={cn("group relative overflow-hidden bg-sunken", rest.length < 3 && "col-span-2")}>
                <SafeImage src={p.url} alt={p.alt} fill sizes="20vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </button>
            ))}
          </div>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-label={`${name} photos`}
        className="m-auto h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-[#0b1620]/90"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="flex h-full flex-col p-3 sm:p-6" onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
          <div className="flex items-center justify-between text-white">
            <p className="text-sm" aria-live="polite">
              {index + 1} / {photos.length}
            </p>
            <button type="button" onClick={() => dialog.current?.close()} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10" autoFocus>
              <X className="size-5" aria-hidden />
              <span className="sr-only">Close photos</span>
            </button>
          </div>
          <figure className="relative mx-auto my-4 w-full max-w-5xl flex-1">
            <SafeImage key={current.url} src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" />
          </figure>
          <figcaption className="mx-auto max-w-3xl text-center text-sm text-white/80">
            {current.caption}
            {current.credit && <span className="block text-xs text-white/60">{current.credit}</span>}
          </figcaption>
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" onClick={() => step(-1)} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="size-5" aria-hidden />
                <span className="sr-only">Previous photo</span>
              </button>
              <button type="button" onClick={() => step(1)} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="size-5" aria-hidden />
                <span className="sr-only">Next photo</span>
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
