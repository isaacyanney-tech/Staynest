import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { logError } from "@/lib/log";

// Counters live in Postgres (public.take_rate_limit), so every server
// instance shares them. Signed-in writes are also limited inside the
// database; these limits cover the forms that run before anyone is signed in.

export const LIMITS = {
  signInAttemptsPerIp: { max: 200, windowSeconds: 600 },
  signInFailuresPerIp: { max: 30, windowSeconds: 900 },
  signInFailuresPerEmail: { max: 10, windowSeconds: 900 },
  signUpsPerIp: { max: 10, windowSeconds: 3600 },
  resetsPerIp: { max: 5, windowSeconds: 3600 },
  resetsPerEmail: { max: 3, windowSeconds: 3600 },
} as const;

export type Limit = { max: number; windowSeconds: number };

export const TOO_MANY = "Too many attempts. Wait a few minutes and try again.";

/** The visitor's address as Netlify reports it, falling back to standard proxy headers. */
export function ipFrom(h: Pick<Headers, "get">): string {
  const direct = h.get("x-nf-client-connection-ip") ?? h.get("x-real-ip");
  const forwarded = h.get("x-forwarded-for")?.split(",")[0];
  const ip = (direct ?? forwarded ?? "").trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "unknown";
}

export async function clientIp(): Promise<string> {
  return ipFrom(await headers());
}

/**
 * Records one hit against `key` (cost 1) and says whether it is allowed, or
 * with cost 0 only checks whether another hit would be allowed. If the
 * counter cannot be reached the request is allowed and the failure logged:
 * an outage of the limiter should not lock everyone out.
 */
export async function rateLimit(key: string, limit: Limit, cost: 0 | 1 = 1): Promise<boolean> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return true; // Not configured (local development without a service key).
  }
  try {
    const { data, error } = await supabase
      .rpc("take_rate_limit", { p_key: key, p_max: limit.max, p_window_seconds: limit.windowSeconds, p_cost: cost })
      .abortSignal(AbortSignal.timeout(4000));
    if (error) throw error;
    return data !== false;
  } catch (e) {
    logError("rate_limit_unavailable", e, { key: key.split(":")[0] });
    return true;
  }
}
