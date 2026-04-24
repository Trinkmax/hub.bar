"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Banknote,
  CreditCard,
  QrCode,
  Building2,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn, formatARS } from "@/lib/utils";
import { closeOrder } from "@/lib/actions/orders";
import type { Database } from "@/lib/db/types";

type Method = Database["public"]["Enums"]["payment_method"];

const METHODS: Array<{ key: Method; label: string; icon: React.ReactNode }> = [
  { key: "cash", label: "Efectivo", icon: <Banknote className="w-4 h-4" /> },
  { key: "card", label: "Tarjeta", icon: <CreditCard className="w-4 h-4" /> },
  { key: "qr", label: "QR / MP", icon: <QrCode className="w-4 h-4" /> },
  { key: "transfer", label: "Transferencia", icon: <Building2 className="w-4 h-4" /> },
];

type Split = { id: string; method: Method; amount: number };

export function CloseSheet({
  orderId,
  subtotal,
  tipSuggestionPct,
  onClose,
}: {
  orderId: string;
  subtotal: number;
  tipSuggestionPct: number;
  onClose: () => void;
}) {
  const [tipPct, setTipPct] = useState(tipSuggestionPct);
  const [splits, setSplits] = useState<Split[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();

  const tip = useMemo(() => Math.round((subtotal * tipPct) / 100), [subtotal, tipPct]);
  const total = subtotal + tip;
  const paid = splits.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = total - paid;
  const overpaid = pendingAmount < 0;

  function addSplit(method: Method) {
    const amount = Math.max(0, pendingAmount > 0 ? pendingAmount : 0);
    setSplits((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), method, amount },
    ]);
  }

  function removeSplit(id: string) {
    setSplits((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSplit(id: string, amount: number) {
    setSplits((prev) => prev.map((s) => (s.id === id ? { ...s, amount } : s)));
  }

  function finish() {
    if (pendingAmount > 0.5) {
      toast.error(`Falta cobrar ${formatARS(pendingAmount)}`);
      return;
    }
    if (overpaid) {
      toast.error(`Se pasó por ${formatARS(-pendingAmount)}`);
      return;
    }
    start(async () => {
      const res = await closeOrder({
        orderId,
        tip,
        payments: splits.map((s) => ({ method: s.method, amount: s.amount })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Mesa cerrada");
      router.push("/mozo");
    });
  }

  function payFullWith(method: Method) {
    setSplits([{ id: "full", method, amount: total }]);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-hub-ink/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-hub-cream rounded-t-3xl sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 flex items-start justify-between border-b border-hub-forest-100">
          <div>
            <div className="text-xs uppercase tracking-widest text-hub-slate">
              Cerrar mesa
            </div>
            <div className="font-display text-3xl text-hub-forest-700">
              Cobrar {formatARS(total)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="card-soft p-3 space-y-1">
            <Row label="Subtotal" value={formatARS(subtotal)} />
            <Row
              label={`Propina ${tipPct}%`}
              value={formatARS(tip)}
              right={
                <div className="flex gap-1">
                  {[0, 5, 10, 15, 20].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTipPct(p)}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        tipPct === p
                          ? "bg-hub-forest-700 text-hub-cream"
                          : "bg-white text-hub-slate",
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              }
            />
            <div className="flex items-center justify-between pt-2 border-t border-hub-forest-100">
              <span className="font-display text-2xl text-hub-forest-700">Total</span>
              <span className="font-display text-3xl text-hub-forest-700">
                {formatARS(total)}
              </span>
            </div>
          </section>

          <section>
            <div className="text-xs uppercase tracking-widest text-hub-slate mb-2">
              Pagar todo con
            </div>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => payFullWith(m.key)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-hub-forest-100 bg-white hover:border-hub-orange-500 transition"
                >
                  {m.icon}
                  <span className="text-[11px] font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-hub-slate">
                Dividir / varios métodos
              </div>
              <div className="flex gap-1">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => addSplit(m.key)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-hub-forest-100 text-xs font-semibold text-hub-forest-700"
                  >
                    <Plus className="w-3 h-3" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {splits.length === 0 ? (
              <div className="text-center text-xs text-hub-slate py-3 opacity-70">
                Agregá un método o usá “pagar todo” arriba.
              </div>
            ) : (
              <ul className="space-y-2">
                {splits.map((s) => (
                  <li key={s.id} className="card-soft p-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md bg-hub-forest-50 text-xs font-bold uppercase">
                      {METHODS.find((m) => m.key === s.method)?.label}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.amount}
                      onChange={(e) => updateSplit(s.id, Math.max(0, Number(e.target.value)))}
                      className="flex-1 px-3 py-2 rounded-lg border border-hub-forest-100 text-right font-display text-lg focus:outline-none focus:ring-2 focus:ring-hub-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSplit(s.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Quitar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-between",
              Math.abs(pendingAmount) < 0.5
                ? "bg-green-100 text-green-800"
                : overpaid
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800",
            )}
          >
            <span>
              {Math.abs(pendingAmount) < 0.5
                ? "Cuadrado"
                : overpaid
                  ? "Sobra"
                  : "Falta"}
            </span>
            <span>{formatARS(Math.abs(pendingAmount))}</span>
          </div>
        </div>

        <footer className="p-5 border-t border-hub-forest-100 bg-white/70">
          <button
            type="button"
            disabled={pending}
            onClick={finish}
            className="w-full h-14 rounded-2xl bg-hub-forest-700 text-hub-cream font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
          >
            <CheckCircle2 className="w-5 h-5" />
            {pending ? "Cerrando…" : "Confirmar cierre"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  right,
}: {
  label: string;
  value: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-hub-slate">{label}</span>
        {right}
      </div>
      <span className="font-mono">{value}</span>
    </div>
  );
}

void Minus;
