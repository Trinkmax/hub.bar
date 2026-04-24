import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { FloorsView } from "@/components/floor/floors-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MozoHome() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const admin = getSupabaseAdmin();
  const [floorsRes, tablesRes, ordersRes] = await Promise.all([
    admin
      .from("floors")
      .select("id, name, sort_order, width, height")
      .eq("branch_id", session.branch_id)
      .order("sort_order"),
    admin
      .from("tables")
      .select(
        "id, floor_id, number, capacity, shape, position_x, position_y, width, height, rotation, status",
      )
      .eq("branch_id", session.branch_id)
      .eq("active", true)
      .order("number"),
    admin
      .from("orders")
      .select("id, table_id, opened_at, guest_count, status, waiter_id")
      .eq("branch_id", session.branch_id)
      .in("status", ["open", "sent", "bill_requested"]),
  ]);

  const floors = floorsRes.data ?? [];
  const tables = tablesRes.data ?? [];
  const openOrdersByTable: Record<string, NonNullable<typeof ordersRes.data>[number]> = {};
  for (const o of ordersRes.data ?? []) {
    openOrdersByTable[o.table_id] = o;
  }

  return (
    <FloorsView
      floors={floors}
      tables={tables}
      openOrdersByTable={openOrdersByTable}
    />
  );
}
