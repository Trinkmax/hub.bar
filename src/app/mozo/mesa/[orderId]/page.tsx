import { notFound, redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { OrderScreen } from "@/components/order/order-screen";

export const dynamic = "force-dynamic";

export default async function MesaPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, branch_id, table_id, waiter_id, status, opened_at, guest_count, subtotal, total, tip_amount",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const [table, items, categories, menuItems, variants, modGroups, mods, mim] =
    await Promise.all([
      admin
        .from("tables")
        .select("id, number, capacity, floor_id")
        .eq("id", order.table_id)
        .maybeSingle(),
      admin
        .from("order_items")
        .select(
          "id, menu_item_id, variant_id, combo_id, name_snapshot, qty, unit_price, mods_total, line_total, station, status, notes_free_text, sent_at, ready_at, served_at, created_at, order_item_modifiers(id, name_snapshot, price_delta_snapshot)",
        )
        .eq("order_id", orderId)
        .neq("status", "cancelled")
        .order("created_at"),
      admin
        .from("menu_categories")
        .select("id, name, slug, icon, color, sort_order")
        .eq("branch_id", session.branch_id)
        .eq("active", true)
        .order("sort_order"),
      admin
        .from("menu_items")
        .select(
          "id, category_id, name, description, base_price, station, tags, active, sort_order",
        )
        .eq("branch_id", session.branch_id)
        .eq("active", true)
        .order("sort_order"),
      admin
        .from("menu_item_variants")
        .select("id, item_id, name, price_delta, is_default, sort_order, active")
        .eq("active", true)
        .order("sort_order"),
      admin
        .from("modifier_groups")
        .select("id, name, min_select, max_select, required, sort_order")
        .eq("branch_id", session.branch_id)
        .order("sort_order"),
      admin.from("modifiers").select("id, group_id, name, price_delta, sort_order, active").eq("active", true).order("sort_order"),
      admin.from("menu_item_modifier_groups").select("item_id, group_id, sort_order"),
    ]);

  return (
    <OrderScreen
      order={order}
      table={table.data!}
      initialItems={(items.data ?? []) as unknown as Parameters<typeof OrderScreen>[0]["initialItems"]}
      categories={categories.data ?? []}
      menuItems={menuItems.data ?? []}
      variants={variants.data ?? []}
      modifierGroups={modGroups.data ?? []}
      modifiers={mods.data ?? []}
      menuItemModifierGroups={mim.data ?? []}
    />
  );
}
