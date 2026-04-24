import { redirect } from "next/navigation";
import Link from "next/link";
import { ChefHat, Martini } from "lucide-react";
import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TopBar } from "@/components/top-bar";

export const dynamic = "force-dynamic";

export default async function KdsPickStation() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");
  const admin = getSupabaseAdmin();
  const { data: stations } = await admin
    .from("stations")
    .select("id, name, kind, color")
    .eq("branch_id", session.branch_id)
    .eq("active", true);
  const { data: branch } = await admin.from("branches").select("name").eq("id", session.branch_id).maybeSingle();

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar
        waiterName={session.full_name}
        role={session.role}
        branchName={branch?.name ?? "HUB!"}
      />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
          {(stations ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/kds/${s.id}`}
              className="card-soft p-8 flex flex-col items-center gap-3 hover:shadow-lg transition"
              style={s.color ? { borderColor: s.color, borderWidth: 2 } : undefined}
            >
              {s.kind === "bar" ? (
                <Martini className="w-14 h-14 text-hub-orange-500" />
              ) : (
                <ChefHat className="w-14 h-14 text-hub-forest-700" />
              )}
              <div className="font-display text-4xl text-hub-forest-700">{s.name}</div>
              <div className="text-sm text-hub-slate uppercase tracking-widest">
                {s.kind}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
