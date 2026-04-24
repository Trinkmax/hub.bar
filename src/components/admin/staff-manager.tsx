"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, KeyRound, Power, X, Copy } from "lucide-react";
import { createStaff, resetStaffPin, toggleStaffActive } from "@/lib/actions/staff";
import type { Database } from "@/lib/db/types";

type Staff = Pick<
  Database["public"]["Tables"]["staff"]["Row"],
  "id" | "full_name" | "nickname" | "role" | "active" | "color" | "created_at" | "pin_last_reset_at"
>;

const ROLE_OPTIONS: Array<{ value: Database["public"]["Enums"]["staff_role"]; label: string }> = [
  { value: "waiter", label: "Mozo" },
  { value: "kitchen", label: "Cocina" },
  { value: "bar", label: "Barra" },
  { value: "cashier", label: "Cajero" },
  { value: "manager", label: "Encargado" },
  { value: "admin", label: "Admin" },
];

export function StaffManager({ initialStaff }: { initialStaff: Staff[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState<Staff | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold"
        >
          <Plus className="w-4 h-4" />
          Nuevo mozo
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.map((s) => (
          <div key={s.id} className="card-soft p-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-display text-xl"
              style={{ background: s.color || "#1B4332" }}
            >
              {(s.nickname ?? s.full_name).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{s.full_name}</div>
              <div className="text-xs uppercase tracking-widest text-hub-slate">{s.role}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => setResetFor(s)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white border border-hub-forest-100 hover:bg-hub-forest-50"
              >
                <KeyRound className="w-3 h-3" />
                PIN
              </button>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    const res = await toggleStaffActive(s.id, !s.active);
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
                  })
                }
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${s.active ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}`}
              >
                <Power className="w-3 h-3" />
                {s.active ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="card-soft p-6 text-center text-hub-slate md:col-span-2 lg:col-span-3">
            Sin staff aún. Agregá el primero.
          </div>
        )}
      </div>

      {addOpen && (
        <AddStaffDialog
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            router.refresh();
          }}
          pending={pending}
          start={start}
        />
      )}

      {resetFor && (
        <ResetPinDialog
          staff={resetFor}
          onClose={() => setResetFor(null)}
          pending={pending}
          start={start}
        />
      )}
    </div>
  );
}

function AddStaffDialog({
  onClose,
  onDone,
  pending,
  start,
}: {
  onClose: () => void;
  onDone: () => void;
  pending: boolean;
  start: React.TransitionStartFunction;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Database["public"]["Enums"]["staff_role"]>("waiter");
  const [pin, setPin] = useState("");
  const [pinCopied, setPinCopied] = useState(false);

  function generatePin() {
    const v = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(v);
    setPinCopied(false);
  }

  function submit() {
    if (fullName.trim().length < 2) return toast.error("Nombre muy corto");
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN debe ser 4-6 dígitos");
    start(async () => {
      const res = await createStaff({
        full_name: fullName.trim(),
        role,
        pin,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Staff creado. PIN: ${pin}`);
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-hub-ink/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-hub-cream rounded-t-3xl sm:rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-hub-slate">Alta</div>
            <div className="font-display text-3xl text-hub-forest-700">Nuevo staff</div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre completo">
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-hub-forest-100 focus:outline-none focus:ring-2 focus:ring-hub-orange-500"
              placeholder="Ej: Juan Pérez"
            />
          </Field>
          <Field label="Rol">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full px-3 py-2 rounded-lg border border-hub-forest-100 bg-white"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PIN (4-6 dígitos)">
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="flex-1 px-3 py-2 rounded-lg border border-hub-forest-100 font-mono text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-hub-orange-500"
                placeholder="1234"
              />
              <button
                type="button"
                onClick={generatePin}
                className="px-3 py-2 rounded-lg bg-white border border-hub-forest-100 text-sm font-semibold"
              >
                Generar
              </button>
              {pin && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(pin);
                    setPinCopied(true);
                    setTimeout(() => setPinCopied(false), 1500);
                  }}
                  className="px-3 py-2 rounded-lg bg-white border border-hub-forest-100 text-sm font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {pinCopied ? "Copiado" : "Copiar"}
                </button>
              )}
            </div>
            <p className="text-xs text-hub-slate mt-1">
              Este PIN se muestra una sola vez. Anotálo antes de confirmar.
            </p>
          </Field>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="mt-6 w-full h-12 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear staff"}
        </button>
      </div>
    </div>
  );
}

function ResetPinDialog({
  staff,
  onClose,
  pending,
  start,
}: {
  staff: Staff;
  onClose: () => void;
  pending: boolean;
  start: React.TransitionStartFunction;
}) {
  const [pin, setPin] = useState("");
  const router = useRouter();

  function submit() {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN debe ser 4-6 dígitos");
    start(async () => {
      const res = await resetStaffPin(staff.id, pin);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`PIN reiniciado para ${staff.full_name}: ${pin}`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-hub-ink/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-hub-cream rounded-t-3xl sm:rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-widest text-hub-slate">Reset PIN</div>
        <div className="font-display text-2xl text-hub-forest-700 mb-4">{staff.full_name}</div>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full px-3 py-3 rounded-lg border border-hub-forest-100 font-mono text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-hub-orange-500"
          placeholder="nuevo PIN"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-white border border-hub-forest-100 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 h-11 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-hub-slate">{label}</span>
      {children}
    </label>
  );
}
