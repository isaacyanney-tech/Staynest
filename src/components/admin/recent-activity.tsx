import { getAuditLog } from "@/lib/admin/queries";
import { describeAudit } from "@/lib/admin/audit";
import { formatDate } from "@/lib/format";

export async function RecentActivity({ limit }: { limit: number }) {
  const { entries } = await getAuditLog({ limit });
  if (entries.length === 0) return <p className="mt-3 text-muted">Nothing has happened yet.</p>;
  return (
    <ol className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span>
            <span className="font-medium">{e.actorName ?? "System"}</span> · {describeAudit(e)}
          </span>
          <time dateTime={e.createdAt} className="text-ink/70">
            {formatDate(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </li>
      ))}
    </ol>
  );
}
