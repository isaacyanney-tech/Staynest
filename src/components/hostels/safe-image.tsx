"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

/** next/image with a designed fallback when the source fails to load. */
export function SafeImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("flex size-full flex-col items-center justify-center gap-2 bg-sunken text-ink/70", className)}
      >
        <ImageOff className="size-6" aria-hidden />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }
  return <Image alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
