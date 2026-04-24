import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing. Check .env.local.",
    );
  }
  adminClient = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
