"use client";
import { useOptimistic, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleSaved } from "@/lib/actions/students";
import { cn } from "@/lib/cn";

export function SaveButton({ hostelId, initiallySaved }: { hostelId: string; initiallySaved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div>
      <button
        type="button"
        aria-pressed={optimistic}
        onClick={() =>
          start(async () => {
            setOptimistic(!saved);
            const result = await toggleSaved(hostelId, !saved);
            setSaved(result.saved);
            setError(result.error ?? null);
          })
        }
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium hover:border-brand hover:text-brand"
      >
        <Heart
          className={cn("size-4 transition-[fill,color,transform] duration-200", optimistic && "scale-110 fill-danger text-danger")}
          aria-hidden
        />
        {optimistic ? "Saved" : "Save"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
