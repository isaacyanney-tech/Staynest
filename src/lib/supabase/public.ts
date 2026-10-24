import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { timeoutFetch } from "./timeout-fetch";

/**
 * Cookie-less anonymous client for public content. Safe inside "use cache"
 * functions because it never reads the request.
 */
export function createPublicClient() {
  assertSupabaseConfigured();
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timeoutFetch },
  });
}
