import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TopBar } from "@/components/top-bar";

export default async function MozoLayout({ children }: { children: React.ReactNode }) {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const admin = getSupabaseAdmin();
  const { data: branch } = await admin
    .from("branches")
    .select("name")
    .eq("id", session.branch_id)
    .maybeSingle();

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar
        waiterName={session.full_name || "Mozo"}
        role={session.role}
        branchName={branch?.name || "HUB!"}
      />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
