"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { comparePin, validatePinFormat } from "@/lib/auth/pin";
import { signHubSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";

const PinSchema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d+$/),
});

export type LoginResult =
  | { ok: true; role: string }
  | { ok: false; error: string };

export async function loginWithPin(formData: FormData): Promise<LoginResult> {
  const parsed = PinSchema.safeParse({ pin: formData.get("pin") });
  if (!parsed.success || !validatePinFormat(parsed.data.pin)) {
    return { ok: false, error: "PIN inválido" };
  }

  const admin = getSupabaseAdmin();
  const { data: staffList, error } = await admin
    .from("staff")
    .select("id, full_name, pin_hash, role, branch_id, active, branches(id, organization_id)")
    .eq("active", true);

  if (error || !staffList) {
    return { ok: false, error: "Error del servidor" };
  }

  let matched: (typeof staffList)[number] | null = null;
  for (const s of staffList) {
    if (await comparePin(parsed.data.pin, s.pin_hash)) {
      matched = s;
      break;
    }
  }

  if (!matched) {
    return { ok: false, error: "PIN no reconocido" };
  }

  const orgId = (matched.branches as unknown as { organization_id: string })?.organization_id;

  const sessionId = nanoid();
  const ttlDays = Number(process.env.SESSION_MAX_AGE_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await admin.from("staff_sessions").insert({
    id: sessionId,
    staff_id: matched.id,
    expires_at: expiresAt.toISOString(),
  });

  const token = await signHubSession(
    {
      staff_id: matched.id,
      branch_id: matched.branch_id,
      organization_id: orgId,
      role: matched.role,
      full_name: matched.full_name,
      session_id: sessionId,
    },
    ttlDays,
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  });

  return { ok: true, role: matched.role };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
