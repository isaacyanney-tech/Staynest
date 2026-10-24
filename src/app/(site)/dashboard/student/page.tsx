import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelInspection } from "@/lib/actions/students";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { DashboardHeader, DashboardSkeleton, STATUS_LABEL, STATUS_TONE } from "@/components/dashboard/shell";
import { PendingButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Your dashboard", robots: { index: false } };

export default function StudentDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <StudentDashboard />
      </Suspense>
    </div>
  );
}

const TIME_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

async function StudentDashboard() {
  const viewer = await requireRole(["student"]);
  const supabase = await createClient();
  const [{ data: requests }, { data: saved }] = await Promise.all([
    supabase
      .from("inspection_requests")
      .select("id, status, preferred_date, preferred_time, proposed_date, owner_response, created_at, hostels(slug, name, area), room_types(name)")
      .eq("student_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("saved_hostels")
      .select("created_at, hostels(id, slug, name, area, price_from, status)")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <>
      <DashboardHeader viewer={viewer} title="Your hostel search">
        <LinkButton href="/hostels" variant="outline">
          Find hostels
        </LinkButton>
      </DashboardHeader>

      <section aria-labelledby="inspections-heading" className="mt-10">
        <h2 id="inspections-heading" className="text-xl font-semibold">
          Inspection requests
        </h2>
        {!requests?.length ? (
          <EmptyState className="mt-4" title="No inspection requests yet" action={<LinkButton href="/hostels">Browse hostels</LinkButton>}>
            When you find a hostel you like, request an inspection from its page. Replies from owners appear here.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {requests.map((r) => {
              const open = r.status === "requested" || r.status === "accepted" || r.status === "rescheduled";
              return (
                <li key={r.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.hostels ? (
                        <Link href={`/hostels/${r.hostels.slug}`} className="font-semibold hover:text-brand hover:underline">
                          {r.hostels.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">Hostel no longer listed</span>
                      )}
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays className="size-4" aria-hidden />
                      {formatDate(r.preferred_date, { dateStyle: "full" })}, {TIME_LABEL[r.preferred_time] ?? r.preferred_time}
                      {r.room_types?.name && <> · {r.room_types.name}</>}
                    </p>
                    {r.status === "rescheduled" && r.proposed_date && (
                      <p className="mt-2 text-sm">
                        The owner proposed <strong>{formatDate(r.proposed_date, { dateStyle: "full" })}</strong>.
                      </p>
                    )}
                    {r.owner_response && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-sm">“{r.owner_response}”</p>}
                    {(r.status === "accepted" || r.status === "completed") && r.hostels && (
                      <Link href={`/hostels/${r.hostels.slug}#ratings-heading`} className="mt-2 inline-flex text-sm font-medium text-brand hover:underline">
                        Rate this hostel
                      </Link>
                    )}
                  </div>
                  {open && (
                    <form action={cancelInspection}>
                      <input type="hidden" name="id" value={r.id} />
                      <PendingButton className="text-sm font-medium text-danger hover:underline">
                        Cancel request
                      </PendingButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="saved-heading" className="mt-12">
        <h2 id="saved-heading" className="text-xl font-semibold">
          Saved hostels
        </h2>
        {!saved?.length ? (
          <p className="mt-3 text-muted">Hostels you save appear here so you can compare them later.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {saved.map((s) =>
              s.hostels ? (
                <li key={s.hostels.id} className="rounded-lg border border-line bg-surface p-4">
                  {s.hostels.status === "published" ? (
                    <Link href={`/hostels/${s.hostels.slug}`} className="font-semibold hover:text-brand hover:underline">
                      {s.hostels.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{s.hostels.name}</span>
                  )}
                  <p className="mt-0.5 text-sm text-muted">
                    {s.hostels.area} · from {formatMoney(s.hostels.price_from)}
                  </p>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </>
  );
}
