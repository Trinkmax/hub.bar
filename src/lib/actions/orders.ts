"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";

type OrderItemStatus = Database["public"]["Enums"]["order_item_status"];

export async function openOrderForTable(tableId: string, guestCount: number) {
  try {
    const session = await requireSession();
    if (!tableId) return { ok: false as const, error: "Falta mesa" };
    if (!guestCount || guestCount < 1) guestCount = 1;

    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("table_id", tableId)
      .in("status", ["open", "sent", "bill_requested"])
      .maybeSingle();

    if (existing) return { ok: true as const, orderId: existing.id, reused: true };

    const { data: order, error } = await admin
      .from("orders")
      .insert({
        branch_id: session.branch_id,
        table_id: tableId,
        waiter_id: session.staff_id,
        guest_count: guestCount,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !order) {
      return { ok: false as const, error: error?.message ?? "No se pudo abrir" };
    }

    await admin.from("tables").update({ status: "occupied" }).eq("id", tableId);
    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: order.id,
      event: "opened",
      actor_id: session.staff_id,
      payload: { guest_count: guestCount },
    });

    revalidatePath("/mozo");
    return { ok: true as const, orderId: order.id, reused: false };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

const AddItemSchema = z.object({
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid().nullable().optional(),
  variantId: z.string().uuid().nullable().optional(),
  comboId: z.string().uuid().nullable().optional(),
  qty: z.number().int().positive().default(1),
  nameSnapshot: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  station: z.enum(["kitchen", "bar"]),
  notes: z.string().nullable().optional(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid().nullable(),
        name: z.string(),
        priceDelta: z.number(),
      }),
    )
    .default([]),
});

export type AddItemInput = z.infer<typeof AddItemSchema>;

export async function addItemToOrder(input: AddItemInput) {
  try {
    const session = await requireSession();
    const parsed = AddItemSchema.parse(input);
    const admin = getSupabaseAdmin();

    const modsTotal = parsed.modifiers.reduce((s, m) => s + m.priceDelta, 0);

    const { data: item, error } = await admin
      .from("order_items")
      .insert({
        branch_id: session.branch_id,
        order_id: parsed.orderId,
        menu_item_id: parsed.menuItemId ?? null,
        variant_id: parsed.variantId ?? null,
        combo_id: parsed.comboId ?? null,
        name_snapshot: parsed.nameSnapshot,
        qty: parsed.qty,
        unit_price: parsed.unitPrice,
        mods_total: modsTotal,
        station: parsed.station,
        status: "draft",
        notes_free_text: parsed.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !item) {
      return { ok: false as const, error: error?.message ?? "No se pudo agregar" };
    }

    if (parsed.modifiers.length > 0) {
      await admin.from("order_item_modifiers").insert(
        parsed.modifiers.map((m) => ({
          order_item_id: item.id,
          modifier_id: m.modifierId,
          name_snapshot: m.name,
          price_delta_snapshot: m.priceDelta,
        })),
      );
    }

    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: parsed.orderId,
      order_item_id: item.id,
      event: "item_added",
      actor_id: session.staff_id,
      payload: { name: parsed.nameSnapshot, qty: parsed.qty },
    });

    revalidatePath(`/mozo/mesa/${parsed.orderId}`);
    return { ok: true as const, itemId: item.id };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function removeDraftItem(itemId: string) {
  try {
    const session = await requireSession();
    const admin = getSupabaseAdmin();
    const { data: item } = await admin
      .from("order_items")
      .select("id, order_id, status")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return { ok: false as const, error: "Ítem no existe" };
    if (item.status !== "draft") {
      return { ok: false as const, error: "Solo se puede borrar ítems en borrador" };
    }
    await admin.from("order_items").delete().eq("id", itemId);
    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: item.order_id,
      event: "item_removed",
      actor_id: session.staff_id,
      payload: { item_id: itemId },
    });
    revalidatePath(`/mozo/mesa/${item.order_id}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function updateItemQty(itemId: string, qty: number) {
  try {
    const session = await requireSession();
    if (qty < 1) return removeDraftItem(itemId);
    const admin = getSupabaseAdmin();
    const { data: item } = await admin
      .from("order_items")
      .select("id, order_id, status")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return { ok: false as const, error: "No existe" };
    if (item.status !== "draft") {
      return { ok: false as const, error: "Solo editable en borrador" };
    }
    await admin.from("order_items").update({ qty }).eq("id", itemId);
    revalidatePath(`/mozo/mesa/${item.order_id}`);
    void session;
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function sendToStations(orderId: string) {
  try {
    const session = await requireSession();
    const admin = getSupabaseAdmin();

    const { data: drafts } = await admin
      .from("order_items")
      .select("id, station")
      .eq("order_id", orderId)
      .eq("status", "draft");

    if (!drafts || drafts.length === 0) {
      return { ok: false as const, error: "No hay ítems nuevos" };
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("order_items")
      .update({ status: "sent", sent_at: now })
      .eq("order_id", orderId)
      .eq("status", "draft");

    if (error) return { ok: false as const, error: error.message };

    await admin.from("orders").update({ status: "sent" }).eq("id", orderId);

    // Create print jobs per station
    const { data: printers } = await admin
      .from("printers")
      .select("id, station_id")
      .eq("branch_id", session.branch_id)
      .eq("active", true);

    if (printers && printers.length > 0) {
      const stationsWithItems = new Set(drafts.map((d) => d.station).filter(Boolean));
      const jobs: Array<Database["public"]["Tables"]["print_jobs"]["Insert"]> = [];
      for (const p of printers) {
        const { data: station } = await admin
          .from("stations")
          .select("kind")
          .eq("id", p.station_id!)
          .maybeSingle();
        if (!station) continue;
        if (stationsWithItems.has(station.kind as "kitchen" | "bar")) {
          jobs.push({
            branch_id: session.branch_id,
            printer_id: p.id,
            kind: "station_ticket",
            payload: { order_id: orderId, station_kind: station.kind, items_count: drafts.length },
            status: "queued",
          });
        }
      }
      if (jobs.length > 0) await admin.from("print_jobs").insert(jobs);
    }

    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: orderId,
      event: "sent_to_station",
      actor_id: session.staff_id,
      payload: { items: drafts.length },
    });

    revalidatePath(`/mozo/mesa/${orderId}`);
    revalidatePath(`/kds`);
    return { ok: true as const, sent: drafts.length };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function advanceItemStatus(itemId: string, next: OrderItemStatus) {
  try {
    const session = await requireSession();
    const admin = getSupabaseAdmin();

    const patch: Database["public"]["Tables"]["order_items"]["Update"] = { status: next };
    const now = new Date().toISOString();
    if (next === "ready") patch.ready_at = now;
    if (next === "served") patch.served_at = now;
    if (next === "cancelled") patch.cancelled_at = now;

    const { data: item, error } = await admin
      .from("order_items")
      .update(patch)
      .eq("id", itemId)
      .select("id, order_id")
      .single();

    if (error || !item) return { ok: false as const, error: error?.message ?? "No se pudo" };

    const event: Database["public"]["Enums"]["order_event"] =
      next === "preparing"
        ? "marked_preparing"
        : next === "ready"
          ? "marked_ready"
          : next === "served"
            ? "marked_served"
            : next === "cancelled"
              ? "item_cancelled"
              : "item_updated";

    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: item.order_id,
      order_item_id: itemId,
      event,
      actor_id: session.staff_id,
      payload: { to: next },
    });

    revalidatePath(`/kds`);
    revalidatePath(`/mozo/mesa/${item.order_id}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function requestBill(orderId: string) {
  const session = await requireSession();
  const admin = getSupabaseAdmin();
  await admin.from("orders").update({ status: "bill_requested" }).eq("id", orderId);
  await admin.from("order_event_log").insert({
    branch_id: session.branch_id,
    order_id: orderId,
    event: "bill_requested",
    actor_id: session.staff_id,
  });
  revalidatePath(`/mozo`);
  revalidatePath(`/mozo/mesa/${orderId}`);
  return { ok: true as const };
}

const CloseSchema = z.object({
  orderId: z.string().uuid(),
  tip: z.number().nonnegative().default(0),
  payments: z
    .array(
      z.object({
        method: z.enum(["cash", "card", "qr", "transfer", "other"]),
        amount: z.number().nonnegative(),
      }),
    )
    .default([]),
});

export async function closeOrder(input: z.infer<typeof CloseSchema>) {
  try {
    const session = await requireSession();
    const parsed = CloseSchema.parse(input);
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: order } = await admin
      .from("orders")
      .select("id, table_id, subtotal, service_charge, total")
      .eq("id", parsed.orderId)
      .maybeSingle();
    if (!order) return { ok: false as const, error: "Orden no existe" };

    await admin
      .from("orders")
      .update({ status: "closed", closed_at: now, tip_amount: parsed.tip })
      .eq("id", parsed.orderId);

    if (parsed.payments.length > 0) {
      await admin.from("payments").insert(
        parsed.payments.map((p) => ({
          branch_id: session.branch_id,
          order_id: parsed.orderId,
          method: p.method,
          amount: p.amount,
          tip: 0,
          actor_id: session.staff_id,
        })),
      );
    }

    await admin.from("tables").update({ status: "free" }).eq("id", order.table_id);
    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: parsed.orderId,
      event: "closed",
      actor_id: session.staff_id,
      payload: { payments: parsed.payments },
    });

    revalidatePath("/mozo");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function splitOrderByItems(orderId: string, itemIds: string[]) {
  try {
    const session = await requireSession();
    const admin = getSupabaseAdmin();
    if (itemIds.length === 0) return { ok: false as const, error: "Seleccioná ítems" };

    const { data: src } = await admin
      .from("orders")
      .select("id, table_id, branch_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!src) return { ok: false as const, error: "Orden no existe" };

    const { data: target, error } = await admin
      .from("orders")
      .insert({
        branch_id: src.branch_id,
        table_id: src.table_id,
        waiter_id: session.staff_id,
        status: "bill_requested",
        metadata: { split_from: orderId },
      })
      .select("id")
      .single();
    if (error || !target) return { ok: false as const, error: error?.message ?? "No se pudo" };

    await admin
      .from("order_items")
      .update({ order_id: target.id })
      .in("id", itemIds)
      .eq("order_id", orderId);

    await admin.from("order_transfers").insert({
      kind: "split",
      source_order_id: orderId,
      target_order_id: target.id,
      moved_item_ids: itemIds,
      actor_id: session.staff_id,
    });
    await admin.from("order_event_log").insert({
      branch_id: session.branch_id,
      order_id: orderId,
      event: "split",
      actor_id: session.staff_id,
      payload: { target_order_id: target.id, items: itemIds },
    });

    revalidatePath("/mozo");
    revalidatePath(`/mozo/mesa/${orderId}`);
    return { ok: true as const, targetOrderId: target.id };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function transferToTable(orderId: string, newTableId: string) {
  const session = await requireSession();
  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("table_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false as const, error: "No existe" };

  await admin.from("orders").update({ table_id: newTableId }).eq("id", orderId);
  await admin.from("tables").update({ status: "free" }).eq("id", order.table_id);
  await admin.from("tables").update({ status: "occupied" }).eq("id", newTableId);
  await admin.from("order_event_log").insert({
    branch_id: session.branch_id,
    order_id: orderId,
    event: "transferred",
    actor_id: session.staff_id,
    payload: { from: order.table_id, to: newTableId },
  });
  revalidatePath("/mozo");
  revalidatePath(`/mozo/mesa/${orderId}`);
  return { ok: true as const };
}
