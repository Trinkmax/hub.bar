"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Clock3, Plus, Minus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn, minutesSince } from "@/lib/utils";
import { openOrderForTable } from "@/lib/actions/orders";
import type { Database } from "@/lib/db/types";

type Floor = Pick<Database["public"]["Tables"]["floors"]["Row"], "id" | "name" | "sort_order" | "width" | "height">;
type TableRow = Pick<
  Database["public"]["Tables"]["tables"]["Row"],
  "id" | "floor_id" | "number" | "capacity" | "shape" | "position_x" | "position_y" | "width" | "height" | "rotation" | "status"
>;
type OpenOrder = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "table_id" | "opened_at" | "guest_count" | "status" | "waiter_id"
>;

export function FloorsView({
  floors,
  tables,
  openOrdersByTable,
}: {
  floors: Floor[];
  tables: TableRow[];
  openOrdersByTable: Record<string, OpenOrder>;
}) {
  const [activeFloor, setActiveFloor] = useState(floors[0]?.id ?? "");
  const [openDialog, setOpenDialog] = useState<TableRow | null>(null);

  const tablesByFloor = useMemo(() => {
    const map: Record<string, TableRow[]> = {};
    for (const t of tables) {
      (map[t.floor_id] ||= []).push(t);
    }
    return map;
  }, [tables]);

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-hub-forest-700/95 text-hub-cream">
        <div className="flex gap-1 px-2 overflow-x-auto scroll-x-hidden-bar">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFloor(f.id)}
              className={cn(
                "px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-t-lg transition",
                activeFloor === f.id
                  ? "bg-hub-cream text-hub-forest-700"
                  : "text-hub-cream/70 hover:text-hub-cream hover:bg-hub-forest-900/30",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-gradient-to-b from-hub-cream-soft to-hub-cream overflow-hidden">
        {floors.map((f) =>
          f.id === activeFloor ? (
            <FloorCanvas
              key={f.id}
              floor={f}
              tables={tablesByFloor[f.id] ?? []}
              openOrdersByTable={openOrdersByTable}
              onTap={(t) => {
                const existing = openOrdersByTable[t.id];
                if (existing) {
                  window.location.href = `/mozo/mesa/${existing.id}`;
                } else {
                  setOpenDialog(t);
                }
              }}
            />
          ) : null,
        )}
      </div>

      {openDialog && (
        <OpenTableDialog
          table={openDialog}
          onClose={() => setOpenDialog(null)}
        />
      )}
    </div>
  );
}

function FloorCanvas({
  floor,
  tables,
  openOrdersByTable,
  onTap,
}: {
  floor: Floor;
  tables: TableRow[];
  openOrdersByTable: Record<string, OpenOrder>;
  onTap: (t: TableRow) => void;
}) {
  return (
    <div className="absolute inset-0 p-2">
      <div
        className="relative w-full h-full rounded-2xl bg-[repeating-linear-gradient(45deg,_rgba(27,67,50,0.04)_0_10px,_transparent_10px_20px)] border-2 border-dashed border-hub-forest-100"
        aria-label={`Plano ${floor.name}`}
      >
        {tables.map((t) => (
          <TableChipView
            key={t.id}
            table={t}
            order={openOrdersByTable[t.id]}
            onClick={() => onTap(t)}
          />
        ))}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-hub-slate text-sm">
            Sin mesas en este piso. Configuralas en Admin.
          </div>
        )}
      </div>
    </div>
  );
}

function TableChipView({
  table,
  order,
  onClick,
}: {
  table: TableRow;
  order: OpenOrder | undefined;
  onClick: () => void;
}) {
  const derivedStatus: Database["public"]["Enums"]["table_status"] = order
    ? order.status === "bill_requested"
      ? "bill"
      : "occupied"
    : table.status;

  const mins = order ? minutesSince(order.opened_at) : 0;
  const aging = mins >= 30 && derivedStatus === "occupied";

  return (
    <button
      type="button"
      onClick={onClick}
      data-status={aging ? "bill" : derivedStatus}
      className="table-chip absolute"
      style={{
        left: `${table.position_x * 100}%`,
        top: `${table.position_y * 100}%`,
        width: `${table.width * 100}%`,
        height: `${table.height * 100}%`,
        borderRadius: table.shape === "circle" ? "50%" : "12px",
        transform: `rotate(${table.rotation}deg)`,
      }}
    >
      <span className="text-2xl leading-none font-display">
        {table.number}
      </span>
      {order ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium opacity-95">
          <Users className="w-3 h-3" />
          {order.guest_count}
          <Clock3 className="w-3 h-3 ml-1" />
          {mins}&apos;
        </span>
      ) : (
        <span className="mt-1 text-[10px] uppercase tracking-widest opacity-80">
          Libre
        </span>
      )}
    </button>
  );
}

function OpenTableDialog({
  table,
  onClose,
}: {
  table: TableRow;
  onClose: () => void;
}) {
  const [guests, setGuests] = useState(Math.min(table.capacity, 2));
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      const res = await openOrderForTable(table.id, guests);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(`/mozo/mesa/${res.orderId}`);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-hub-ink/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 bg-hub-cream rounded-t-3xl sm:rounded-3xl p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xs uppercase tracking-widest text-hub-slate">
          Abrir mesa
        </h2>
        <div className="font-display text-5xl text-hub-forest-700">
          Mesa {table.number}
        </div>
        <p className="text-hub-slate mt-1">
          Capacidad {table.capacity} · forma {table.shape}
        </p>

        <div className="mt-8">
          <label className="text-xs uppercase tracking-widest text-hub-slate">
            Comensales
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              className="w-14 h-14 rounded-full bg-white shadow active:scale-95"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
            >
              <Minus className="w-6 h-6 mx-auto" />
            </button>
            <div className="flex-1 text-center text-5xl font-display text-hub-forest-700">
              {guests}
            </div>
            <button
              type="button"
              className="w-14 h-14 rounded-full bg-white shadow active:scale-95"
              onClick={() => setGuests((g) => g + 1)}
            >
              <Plus className="w-6 h-6 mx-auto" />
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          className="mt-8 w-full h-14 rounded-2xl bg-hub-forest-700 text-hub-cream font-semibold text-lg active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
          onClick={submit}
        >
          <Check className="w-5 h-5" />
          {pending ? "Abriendo…" : "Abrir comanda"}
        </button>
      </div>
    </div>
  );
}
