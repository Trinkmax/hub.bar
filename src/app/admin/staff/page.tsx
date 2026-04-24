import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { StaffManager } from "@/components/admin/staff-manager";

export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const admin = getSupabaseAdmin();
  const { data: staff } = await admin
    .from("staff")
    .select("id, full_name, nickname, role, active, color, created_at, pin_last_reset_at")
    .eq("branch_id", session.branch_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-4xl text-hub-forest-700 mb-6">Mozos y staff</h1>
      <StaffManager initialStaff={staff ?? []} />
    </div>
  );
}
