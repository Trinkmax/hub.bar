"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPin, validatePinFormat } from "@/lib/auth/pin";

const CreateStaffSchema = z.object({
  full_name: z.string().min(2),
  nickname: z.string().optional(),
  role: z.enum(["admin", "manager", "waiter", "kitchen", "bar", "cashier"]),
  pin: z.string().regex(/^\d{4,6}$/),
  color: z.string().optional(),
});

export async function createStaff(input: z.infer<typeof CreateStaffSchema>) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") {
    return { ok: false as const, error: "No autorizado" };
  }
  const parsed = CreateStaffSchema.parse(input);
  if (!validatePinFormat(parsed.pin)) return { ok: false as const, error: "PIN inválido" };

  const admin = getSupabaseAdmin();
  const pin_hash = await hashPin(parsed.pin);
  const { error } = await admin.from("staff").insert({
    branch_id: session.branch_id,
    full_name: parsed.full_name,
    nickname: parsed.nickname,
    role: parsed.role,
    pin_hash,
    color: parsed.color ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const };
}

export async function resetStaffPin(staffId: string, newPin: string) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") {
    return { ok: false as const, error: "No autorizado" };
  }
  if (!validatePinFormat(newPin)) return { ok: false as const, error: "PIN inválido" };
  const admin = getSupabaseAdmin();
  const pin_hash = await hashPin(newPin);
  const { error } = await admin
    .from("staff")
    .update({ pin_hash, pin_last_reset_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("branch_id", session.branch_id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const };
}

export async function toggleStaffActive(staffId: string, active: boolean) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") {
    return { ok: false as const, error: "No autorizado" };
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("staff")
    .update({ active })
    .eq("id", staffId)
    .eq("branch_id", session.branch_id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const };
}
