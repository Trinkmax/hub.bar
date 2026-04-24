import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatARS } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const admin = getSupabaseAdmin();
  const [openOrders, todaySales, staffCount, itemsCount] = await Promise.all([
    admin
      .from("orders")
      .select("id, total, opened_at", { count: "exact", head: false })
      .eq("branch_id", session.branch_id)
      .in("status", ["open", "sent", "bill_requested"]),
    admin
      .from("orders")
      .select("total")
      .eq("branch_id", session.branch_id)
      .eq("status", "closed")
      .gte("closed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    admin.from("staff").select("id", { count: "exact", head: true }).eq("branch_id", session.branch_id).eq("active", true),
    admin.from("menu_items").select("id", { count: "exact", head: true }).eq("branch_id", session.branch_id).eq("active", true),
  ]);

  const today = (todaySales.data ?? []).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div>
      <h1 className="font-display text-4xl text-hub-forest-700 mb-6">Panel</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Mesas abiertas" value={String(openOrders.data?.length ?? 0)} />
        <Card title="Ventas hoy" value={formatARS(today)} />
        <Card title="Staff activo" value={String(staffCount.count ?? 0)} />
        <Card title="Ítems en carta" value={String(itemsCount.count ?? 0)} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="card-soft p-4">
      <div className="text-xs uppercase tracking-widest text-hub-slate">{title}</div>
      <div className="font-display text-3xl text-hub-forest-700 mt-1">{value}</div>
    </div>
  );
}
