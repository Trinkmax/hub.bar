"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TablePatch = z.object({
  id: z.string().uuid(),
  position_x: z.number(),
  position_y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  shape: z.enum(["rect", "circle", "square"]).optional(),
});

export async function updateTablePositions(patches: z.infer<typeof TablePatch>[]) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") {
    return { ok: false as const, error: "No autorizado" };
  }
  const admin = getSupabaseAdmin();
  for (const p of patches) {
    const parsed = TablePatch.parse(p);
    const { id, ...rest } = parsed;
    await admin.from("tables").update(rest).eq("id", id).eq("branch_id", session.branch_id);
  }
  revalidatePath("/admin/floors");
  revalidatePath("/mozo");
  return { ok: true as const };
}

const CreateFloorSchema = z.object({ name: z.string().min(1) });

export async function createFloor(input: z.infer<typeof CreateFloorSchema>) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") return { ok: false as const, error: "No autorizado" };
  const admin = getSupabaseAdmin();
  const { data: max } = await admin
    .from("floors")
    .select("sort_order")
    .eq("branch_id", session.branch_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (max?.sort_order ?? 0) + 1;
  const { data, error } = await admin
    .from("floors")
    .insert({ branch_id: session.branch_id, name: input.name, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/floors");
  return { ok: true as const, id: data!.id };
}

export async function addTableToFloor(floorId: string) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") return { ok: false as const, error: "No autorizado" };
  const admin = getSupabaseAdmin();
  const { data: max } = await admin
    .from("tables")
    .select("number")
    .eq("branch_id", session.branch_id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (max?.number ?? 0) + 1;
  const { data, error } = await admin
    .from("tables")
    .insert({
      branch_id: session.branch_id,
      floor_id: floorId,
      number,
      capacity: 4,
      shape: "square",
      position_x: 0.1,
      position_y: 0.1,
      width: 0.14,
      height: 0.18,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/floors");
  revalidatePath("/mozo");
  return { ok: true as const, id: data!.id };
}

export async function deleteTable(tableId: string) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "manager") return { ok: false as const, error: "No autorizado" };
  const admin = getSupabaseAdmin();
  await admin.from("tables").update({ active: false }).eq("id", tableId).eq("branch_id", session.branch_id);
  revalidatePath("/admin/floors");
  revalidatePath("/mozo");
  return { ok: true as const };
}
