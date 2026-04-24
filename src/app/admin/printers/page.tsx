import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPrinters() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const admin = getSupabaseAdmin();
  const { data: printers } = await admin
    .from("printers")
    .select("id, name, connection, address, active, paper_width_mm, is_customer_receipt, station_id, stations(name)")
    .eq("branch_id", session.branch_id);
  const { data: jobs } = await admin
    .from("print_jobs")
    .select("id, kind, status, tries, created_at, last_error, printer_id")
    .eq("branch_id", session.branch_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="font-display text-4xl text-hub-forest-700 mb-6">Impresoras</h1>
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-hub-slate mb-2">Configuradas</h2>
        {(printers ?? []).length === 0 ? (
          <div className="card-soft p-6 text-center text-hub-slate">
            Sin impresoras registradas. Se conectan desde el KDS o panel dedicado (v2).
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {(printers ?? []).map((p) => (
              <li key={p.id} className="card-soft p-4 flex items-center gap-3">
                <Printer className="w-8 h-8 text-hub-forest-700" />
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-hub-slate uppercase tracking-widest">
                    {p.connection} · {p.paper_width_mm}mm ·{" "}
                    {(p.stations as unknown as { name: string } | null)?.name ?? "sin estación"}
                  </div>
                </div>
                <div className={`text-[10px] uppercase font-bold ${p.active ? "text-green-700" : "text-red-600"}`}>
                  {p.active ? "Activa" : "Pausada"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-hub-slate mb-2">Cola reciente</h2>
        <ul className="card-soft divide-y divide-hub-forest-100">
          {(jobs ?? []).map((j) => (
            <li key={j.id} className="p-3 flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-hub-slate">{new Date(j.created_at).toLocaleTimeString("es-AR")}</span>
              <span className="flex-1 capitalize">{j.kind.replace(/_/g, " ")}</span>
              <span className="text-xs uppercase tracking-widest">{j.status}</span>
              {j.last_error && <span className="text-xs text-red-600 truncate max-w-[180px]">{j.last_error}</span>}
            </li>
          ))}
          {(jobs ?? []).length === 0 && (
            <li className="p-6 text-center text-hub-slate">Sin trabajos aún.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
