"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { readColorMode, setColorMode, subscribeColorMode } from "@/lib/color-mode";
import { cn } from "@/lib/cn";

/** Switches between light and dark mode; the icon turns and swaps on change. */
export function ColorModeToggle({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeColorMode, readColorMode, () => null);
  const dark = mode === "dark";
  return (
    <button
      type="button"
      aria-pressed={mode === null ? undefined : dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setColorMode(dark ? "light" : "dark")}
      className={cn(
        "group relative inline-flex size-10 items-center justify-center overflow-hidden rounded-md text-ink/80 transition-colors hover:bg-sunken hover:text-brand",
        className,
      )}
    >
      <Sun className="color-mode-sun size-[1.15rem] transition-all duration-300 ease-out" aria-hidden />
      <Moon className="color-mode-moon absolute size-[1.15rem] transition-all duration-300 ease-out" aria-hidden />
    </button>
  );
}
