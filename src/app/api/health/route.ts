import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logError } from "@/lib/log";

// For uptime monitors: 200 when the site and its database both answer, 503
// otherwise. Reads one public row, so it reveals nothing and costs little.
export async function GET() {
  await connection();
  const started = Date.now();
  try {
    const { error } = await createPublicClient()
      .from("universities")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
    return NextResponse.json({ ok: true, ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    logError("health_check_failed", e);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
