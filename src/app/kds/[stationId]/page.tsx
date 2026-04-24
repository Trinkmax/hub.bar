import { notFound, redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { KdsBoard } from "@/components/kds/kds-board";
import { TopBar } from "@/components/top-bar";

export const dynamic = "force-dynamic";

export default async function KdsStationPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const admin = getSupabaseAdmin();
  const { data: station } = await admin
    .from("stations")
    .select("id, name, kind, color, branch_id")
    .eq("id", stationId)
    .maybeSingle();
  if (!station) notFound();

  const { data: rawItems } = await admin
    .from("order_items")
    .select(
      "id, order_id, name_snapshot, qty, notes_free_text, station, status, sent_at, ready_at, served_at, created_at, order_item_modifiers(id, name_snapshot), orders(id, guest_count, table_id, tables(number))",
    )
    .eq("branch_id", station.branch_id)
    .eq("station", station.kind as "kitchen" | "bar")
    .in("status", ["sent", "preparing", "ready"])
    .order("sent_at", { ascending: true });

  const { data: branch } = await admin
    .from("branches")
    .select("name")
    .eq("id", session.branch_id)
    .maybeSingle();

  return (
    <div className="flex flex-col min-h-dvh bg-hub-cream-soft">
      <TopBar
        waiterName={session.full_name}
        role={session.role}
        branchName={branch?.name ?? "HUB!"}
      />
      <KdsBoard
        stationId={station.id}
        stationName={station.name}
        stationKind={station.kind}
        initialItems={(rawItems ?? []) as unknown as Parameters<typeof KdsBoard>[0]["initialItems"]}
      />
    </div>
  );
}
