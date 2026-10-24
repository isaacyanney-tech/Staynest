import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "verified" | "demo" | "warning" | "danger" | "info" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink border-line",
  verified: "bg-secondary-soft text-secondary-ink border-secondary/30",
  success: "bg-success-soft text-success border-success/25",
  demo: "bg-warning-soft text-warning border-warning/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-primary-soft text-brand border-brand/20",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium leading-none tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
