// Turns audit_log rows into sentences an administrator can scan. Kept free of
// server-only imports so it can be unit tested.

export type AuditEntry = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
  actorName: string | null;
};

const STATUS: Record<string, string> = {
  draft: "draft",
  pending_review: "in review",
  published: "published",
  rejected: "changes requested",
  suspended: "suspended",
  pending: "waiting for review",
  needs_info: "needs more information",
  approved: "approved",
};

const TABLE: Record<string, string> = {
  plans: "plan",
  business_settings: "business setting",
  featured_placements: "featured placement",
  site_settings: "site settings",
  navigation_items: "navigation link",
  promo_banners: "banner",
  pages: "page",
  media_assets: "media file",
};

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** A short past-tense description, without the actor ("Published a listing"). */
export function describeAudit(e: Pick<AuditEntry, "action" | "entity" | "details">): string {
  const d = obj(e.details);
  switch (e.action) {
    case "hostel.status_changed": {
      const to = str(d.to);
      return to ? `Moved a listing to ${STATUS[to] ?? to}` : "Changed a listing's status";
    }
    case "hostel.verification_changed":
      return d.verified === true ? "Marked a listing as verified" : "Removed a listing's verified badge";
    case "verification.decided": {
      const s = str(d.status);
      return s ? `Marked a verification request as ${STATUS[s] ?? s}` : "Reviewed a verification request";
    }
    case "profile.access_changed": {
      const parts: string[] = [];
      if (d.from_role !== d.to_role && str(d.to_role)) parts.push(`made an account ${d.to_role === "admin" ? "an admin" : `a ${d.to_role}`}`);
      if (d.from_suspended !== d.to_suspended) parts.push(d.to_suspended ? "suspended an account" : "restored an account");
      const text = parts.join(" and ") || "changed an account's access";
      return text[0].toUpperCase() + text.slice(1);
    }
    case "content.published":
      return "Published a content section";
    case "content.unpublished":
      return "Unpublished a content section";
    case "content.reverted":
      return "Restored an earlier version of a content section";
  }
  const [table, op] = e.action.split(".");
  const noun = TABLE[table] ?? table.replace(/_/g, " ");
  const after = obj(d.after);
  const name = str(after.name) ?? str(after.label) ?? str(obj(d.before).name) ?? str(obj(d.before).label);
  const verb = op === "insert" ? "Added" : op === "delete" ? "Deleted" : "Updated";
  return name ? `${verb} the ${noun} “${name}”` : `${verb} a ${noun}`;
}

/** Fields that changed in a before/after audit entry, for a compact diff. */
export function changedFields(details: unknown): { field: string; before: string; after: string }[] {
  const d = obj(details);
  const before = obj(d.before);
  const after = obj(d.after);
  const skip = new Set(["updated_at", "updated_by", "id"]);
  const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));
  return Object.keys({ ...before, ...after })
    .filter((k) => !skip.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, before: show(before[k]), after: show(after[k]) }));
}
