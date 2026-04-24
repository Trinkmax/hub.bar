import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/types";
import { readSessionFromCookies } from "@/lib/auth/session";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const session = await readSessionFromCookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set — ignore.
          }
        },
      },
      global: session?.token
        ? { headers: { Authorization: `Bearer ${session.token}` } }
        : undefined,
    },
  );
}
