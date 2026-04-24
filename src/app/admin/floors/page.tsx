import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { FloorEditor } from "@/components/floor/floor-editor";

export const dynamic = "force-dynamic";

export default async function AdminFloors() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const admin = getSupabaseAdmin();
  const [floorsRes, tablesRes] = await Promise.all([
    admin
      .from("floors")
      .select("id, name, sort_order, width, height")
      .eq("branch_id", session.branch_id)
      .order("sort_order"),
    admin
      .from("tables")
      .select(
        "id, floor_id, number, capacity, shape, position_x, position_y, width, height, rotation, status, active",
      )
      .eq("branch_id", session.branch_id)
      .eq("active", true),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-4xl text-hub-forest-700">Pisos & Mesas</h1>
      </div>
      <FloorEditor floors={floorsRes.data ?? []} tables={tablesRes.data ?? []} />
    </div>
  );
}
