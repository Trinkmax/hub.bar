"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

export function createSupabaseBrowser(accessToken?: string | null) {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : undefined,
  );
}
