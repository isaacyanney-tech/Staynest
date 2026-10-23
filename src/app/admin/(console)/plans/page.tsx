import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getAllPlans } from "@/lib/admin/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PlanForm } from "@/components/admin/plan-form";

export const metadata: Metadata = { title: "Plans and prices · Admin", robots: { index: false, follow: false } };

export default function AdminPlansPage() {
  return (
    <>
      <AdminPageHeader title="Plans and prices" description="What owners pay and what each plan includes. Changes show on the pricing page straight away." />
      <Notice tone="info" className="mt-6" title="Existing subscriptions keep their price">
        A new price applies the next time an owner subscribes or renews. Payments are not live yet, so nobody is charged until checkout is switched on.
      </Notice>
      <Suspense fallback={<DashboardSkeleton />}>
        <Plans />
      </Suspense>
    </>
  );
}

async function Plans() {
  await requireRole(["admin"], "admin");
  const plans = await getAllPlans();
  return (
    <div className="mt-6 space-y-6">
      {plans.map((plan) => (
        <section key={plan.id} aria-labelledby={`plan-${plan.code}`} className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4 flex flex-wrap items-center gap-2">
            <h2 id={`plan-${plan.code}`} className="text-lg font-semibold">
              {plan.name}
            </h2>
            <span className="text-sm text-ink/75">
              {plan.price_amount === 0 ? "Free" : `${formatMoney(plan.price_amount, plan.currency)} a ${plan.billing_interval}`}
            </span>
            {plan.is_default && <Badge tone="info">Default</Badge>}
            {!plan.is_active && <Badge tone="warning">Hidden</Badge>}
            <span className="ml-auto text-xs text-ink/70">Updated {formatDate(plan.updated_at)}</span>
          </header>
          <PlanForm plan={plan} />
        </section>
      ))}
    </div>
  );
}
