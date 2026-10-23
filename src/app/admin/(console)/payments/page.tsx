import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { ADMIN_PAGE_SIZE, getPayments } from "@/lib/admin/queries";
import { PAYMENT_STATUSES, RECHECK_MESSAGES, paymentReferenceSchema, type PaymentStatus } from "@/lib/billing/schemas";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/dashboard/shell";
import { AdminPageHeader, FilterTabs } from "@/components/admin/page-header";
import { RecheckPaymentForm } from "@/components/billing/billing-forms";

export const metadata: Metadata = { title: "Payments · Admin", robots: { index: false, follow: false } };

const TABS: { status?: PaymentStatus; label: string }[] = [
  { label: "All" },
  { status: "success", label: "Paid" },
  { status: "pending", label: "Not finished" },
  { status: "failed", label: "Failed" },
  { status: "abandoned", label: "Cancelled" },
];

const STATUS = {
  success: { label: "Paid", tone: "success" },
  pending: { label: "Not finished", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  abandoned: { label: "Cancelled", tone: "neutral" },
} as const;

export default function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Payments searchParams={searchParams} />
    </Suspense>
  );
}

async function Payments({ searchParams }: Pick<PageProps<"/admin/payments">, "searchParams">) {
  await requireRole(["admin"], "admin");
  const sp = await searchParams;
  const status = PAYMENT_STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const checked = paymentReferenceSchema.safeParse(sp.checked).data;
  const result = typeof sp.result === "string" && sp.result in RECHECK_MESSAGES ? RECHECK_MESSAGES[sp.result as keyof typeof RECHECK_MESSAGES] : null;
  const { rows, total } = await getPayments(status, page);
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (p.status) params.set("status", p.status);
    if (p.page && p.page > 1) params.set("page", String(p.page));
    const s = params.toString();
    return s ? `/admin/payments?${s}` : "/admin/payments";
  };

  return (
    <>
      <AdminPageHeader
        title="Payments"
        description="Every checkout owners start through Paystack. A payment only counts once the server has confirmed it with Paystack and the amount matches the price. If one stays unfinished, you can ask Paystack again."
      />
      {checked && result && (
        <Notice tone={result.tone} className="mt-6">
          <span className="font-mono text-sm">{checked}</span>: {result.text}
        </Notice>
      )}
      <FilterTabs label="Payment status" items={TABS.map((t) => ({ href: href({ status: t.status }), label: t.label, active: t.status === status }))} />
      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={status ? "No payments with this status" : "No payments yet"} />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {rows.map((p) => (
            <li key={p.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.label} · {formatMoney(p.amount, p.currency)}
                  <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                </p>
                <p className="text-sm text-ink/75">
                  {p.ownerName} · started {formatDate(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  {p.verifiedAt && <> · confirmed {formatDate(p.verifiedAt, { dateStyle: "medium", timeStyle: "short" })}</>}
                </p>
                <p className="font-mono text-xs text-ink/70">{p.reference}</p>
                {p.note && p.status !== "success" && <p className="mt-1 text-sm text-ink/75">Paystack: {p.note}</p>}
              </div>
              {p.status === "pending" && <RecheckPaymentForm reference={p.reference} />}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pages={pages} hrefFor={(n) => href({ status, page: n })} />
      </div>
    </>
  );
}
