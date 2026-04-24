"use client";

import { useState, useTransition } from "react";
import { X, Split, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn, formatARS } from "@/lib/utils";
import { splitOrderByItems } from "@/lib/actions/orders";

type ItemLite = {
  id: string;
  name_snapshot: string;
  qty: number;
  line_total: number;
  status: string;
};

export function SplitSheet({
  orderId,
  items,
  onClose,
}: {
  orderId: string;
  items: ItemLite[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTotal = items
    .filter((i) => selected.has(i.id))
    .reduce((s, i) => s + Number(i.line_total), 0);

  function confirm() {
    if (selected.size === 0) {
      toast.error("Seleccioná ítems para mover");
      return;
    }
    start(async () => {
      const res = await splitOrderByItems(orderId, Array.from(selected));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cuenta dividida");
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-hub-ink/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-hub-cream rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 flex items-start justify-between border-b border-hub-forest-100">
          <div>
            <div className="text-xs uppercase tracking-widest text-hub-slate flex items-center gap-1">
              <Split className="w-3 h-3" />
              Dividir cuenta
            </div>
            <div className="font-display text-2xl text-hub-forest-700">
              Seleccioná los ítems de la otra cuenta
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-hub-forest-100">
            {items.map((i) => {
              const on = selected.has(i.id);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => toggle(i.id)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 text-left transition",
                      on ? "bg-hub-forest-50" : "hover:bg-white/50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center",
                        on ? "bg-hub-forest-700 border-hub-forest-700" : "border-hub-forest-200",
                      )}
                    >
                      {on && <CheckCircle2 className="w-4 h-4 text-hub-cream" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {i.qty}× {i.name_snapshot}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-hub-slate">
                        {i.status}
                      </div>
                    </div>
                    <div className="font-display text-lg text-hub-forest-700">
                      {formatARS(i.line_total)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="p-5 border-t border-hub-forest-100 bg-white/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-hub-slate text-sm">Seleccionados</span>
            <span className="font-display text-2xl text-hub-forest-700">
              {formatARS(selectedTotal)}
            </span>
          </div>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={confirm}
            className="w-full h-12 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold disabled:opacity-60"
          >
            {pending ? "Dividiendo…" : `Crear nueva cuenta con ${selected.size} ítem(s)`}
          </button>
        </footer>
      </div>
    </div>
  );
}
