"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Flame, CheckCircle2, Send, Clock3, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { cn, minutesSince } from "@/lib/utils";
import { advanceItemStatus } from "@/lib/actions/orders";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Database } from "@/lib/db/types";

type Station = Database["public"]["Enums"]["station_kind"];

type KdsItem = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  notes_free_text: string | null;
  station: Database["public"]["Enums"]["item_station"] | null;
  status: Database["public"]["Enums"]["order_item_status"];
  sent_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  created_at: string;
  order_item_modifiers: Array<{ id: string; name_snapshot: string }>;
  orders: {
    id: string;
    guest_count: number;
    table_id: string;
    tables: { number: number } | null;
  } | null;
};

export function KdsBoard({
  stationId,
  stationName,
  stationKind,
  initialItems,
}: {
  stationId: string;
  stationName: string;
  stationKind: Station;
  initialItems: KdsItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(true);

  // Map station kinds to item_station: dessert/grill both go to kitchen queue.
  const itemStation: Database["public"]["Enums"]["item_station"] =
    stationKind === "bar" ? "bar" : "kitchen";

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);

  // Realtime
  useEffect(() => {
    const sb = createSupabaseBrowser();
    const channel = sb
      .channel(`kds-${stationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        async (payload) => {
          const row = (payload.new ?? payload.old) as { station?: string | null };
          if (row.station !== itemStation) return;
          // Re-fetch a fresh snapshot (simpler than diffing the payload)
          const { data } = await sb
            .from("order_items")
            .select(
              "id, order_id, name_snapshot, qty, notes_free_text, station, status, sent_at, ready_at, served_at, created_at, order_item_modifiers(id, name_snapshot), orders(id, guest_count, table_id, tables(number))",
            )
            .eq("station", itemStation)
            .in("status", ["sent", "preparing", "ready"])
            .order("sent_at", { ascending: true });
          if (data) {
            setItems(data as unknown as KdsItem[]);
            if (soundOn && payload.eventType === "INSERT") {
              ping();
            }
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [stationId, itemStation, soundOn]);

  function ping() {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.07;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } catch {}
  }

  const cols = useMemo(() => {
    return {
      sent: items.filter((i) => i.status === "sent"),
      preparing: items.filter((i) => i.status === "preparing"),
      ready: items.filter((i) => i.status === "ready"),
    };
  }, [items]);
  void now;

  function advance(id: string, next: Database["public"]["Enums"]["order_item_status"]) {
    start(async () => {
      const res = await advanceItemStatus(id, next);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 flex items-center gap-3 bg-hub-forest-700 text-hub-cream">
        <div className="flex items-center gap-2">
          {stationKind === "bar" ? <Utensils className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
          <div className="font-display text-2xl">{stationName}</div>
        </div>
        <div className="ml-auto text-sm opacity-90">{items.length} pendientes</div>
        <button
          type="button"
          onClick={() => setSoundOn((v) => !v)}
          className="text-xs uppercase tracking-widest px-2 py-1 rounded bg-hub-forest-900/40"
        >
          Sonido {soundOn ? "on" : "off"}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 p-2 overflow-hidden">
        <KdsColumn title="Nuevo" items={cols.sent} variant="sent" onAdvance={(id) => advance(id, "preparing")} onCancel={(id) => advance(id, "cancelled")} pending={pending} />
        <KdsColumn title="En preparación" items={cols.preparing} variant="preparing" onAdvance={(id) => advance(id, "ready")} onCancel={(id) => advance(id, "cancelled")} pending={pending} />
        <KdsColumn title="Listo para servir" items={cols.ready} variant="ready" onAdvance={(id) => advance(id, "served")} onCancel={(id) => advance(id, "cancelled")} pending={pending} />
      </div>
    </main>
  );
}

function KdsColumn({
  title,
  items,
  variant,
  onAdvance,
  onCancel,
  pending,
}: {
  title: string;
  items: KdsItem[];
  variant: "sent" | "preparing" | "ready";
  onAdvance: (id: string) => void;
  onCancel: (id: string) => void;
  pending: boolean;
}) {
  const headerClass =
    variant === "sent"
      ? "bg-hub-forest-200"
      : variant === "preparing"
        ? "bg-amber-200"
        : "bg-green-200";
  const cta = variant === "sent" ? "Empezar" : variant === "preparing" ? "Listo" : "Servido";

  return (
    <section className="flex flex-col bg-white/70 rounded-2xl border border-hub-forest-100 overflow-hidden">
      <header className={cn("px-3 py-2 font-bold uppercase text-sm tracking-widest text-hub-forest-900", headerClass)}>
        {title} · {items.length}
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-xs text-hub-slate py-8 opacity-70">Vacío</div>
        )}
        {items.map((it) => {
          const since = minutesSince(it.sent_at ?? it.created_at);
          const colorMins =
            since < 5 ? "text-green-600" : since < 10 ? "text-amber-600" : "text-red-600";
          return (
            <article
              key={it.id}
              className="card-soft p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-2xl text-hub-forest-700 leading-none">
                  Mesa {it.orders?.tables?.number ?? "—"}
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-semibold", colorMins)}>
                  <Clock3 className="w-3 h-3" /> {since}&apos;
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  {it.qty}× {it.name_snapshot}
                </div>
                {it.order_item_modifiers.length > 0 && (
                  <ul className="text-xs text-hub-slate mt-1 space-y-0.5">
                    {it.order_item_modifiers.map((m) => (
                      <li key={m.id}>+ {m.name_snapshot}</li>
                    ))}
                  </ul>
                )}
                {it.notes_free_text && (
                  <div className="mt-1 text-xs italic font-medium text-hub-orange-700">
                    “{it.notes_free_text}”
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onAdvance(it.id)}
                  className="flex-1 h-10 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold flex items-center justify-center gap-1"
                >
                  {variant === "sent" ? <Send className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {cta}
                </button>
                <button
                  type="button"
                  onClick={() => onCancel(it.id)}
                  className="h-10 w-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center"
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
