import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CategoryIcon } from "@/components/icon";
import { formatARS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMenu() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const admin = getSupabaseAdmin();
  const { data: categories } = await admin
    .from("menu_categories")
    .select("id, name, slug, icon, color, sort_order")
    .eq("branch_id", session.branch_id)
    .eq("active", true)
    .order("sort_order");
  const { data: items } = await admin
    .from("menu_items")
    .select("id, name, base_price, station, category_id, description")
    .eq("branch_id", session.branch_id)
    .eq("active", true)
    .order("sort_order");

  const byCat: Record<string, typeof items extends (infer T)[] | null ? T : never> = {} as never;
  const grouped = new Map<string, Array<NonNullable<typeof items>[number]>>();
  for (const i of items ?? []) {
    if (!grouped.has(i.category_id)) grouped.set(i.category_id, []);
    grouped.get(i.category_id)!.push(i);
  }
  void byCat;

  return (
    <div>
      <h1 className="font-display text-4xl text-hub-forest-700 mb-6">Menú</h1>
      <p className="text-sm text-hub-slate mb-4">
        Vista de solo lectura por ahora. El editor completo se activa en v2.
      </p>
      <div className="flex flex-col gap-6">
        {(categories ?? []).map((c) => (
          <section key={c.id}>
            <header className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: c.color || "#1B4332", color: "#fff" }}
              >
                <CategoryIcon name={c.icon} className="w-4 h-4" />
              </div>
              <h2 className="font-display text-2xl text-hub-forest-700">{c.name}</h2>
              <span className="text-xs text-hub-slate">
                ({grouped.get(c.id)?.length ?? 0})
              </span>
            </header>
            <div className="grid md:grid-cols-2 gap-2">
              {(grouped.get(c.id) ?? []).map((i) => (
                <div key={i.id} className="card-soft p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-semibold">{i.name}</div>
                    {i.description && (
                      <div className="text-xs text-hub-slate mt-0.5 line-clamp-2">
                        {i.description}
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-widest text-hub-slate mt-1">
                      {i.station === "kitchen" ? "Cocina" : "Barra"}
                    </div>
                  </div>
                  <div className="font-display text-lg text-hub-forest-700">
                    {formatARS(i.base_price)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
