import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-[0.9375rem] text-muted">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-primary/20 bg-primary-soft text-primary",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-danger/25 bg-danger-soft text-danger",
  }[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-[0.9375rem]", styles, className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-0.5", "text-ink/85")}>{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
