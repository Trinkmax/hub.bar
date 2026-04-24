"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { Plus, Trash2, Save, RotateCw, Square, Circle, Users, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  addTableToFloor,
  createFloor,
  deleteTable,
  updateTablePositions,
} from "@/lib/actions/floors";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/db/types";

type Floor = Pick<Database["public"]["Tables"]["floors"]["Row"], "id" | "name" | "sort_order" | "width" | "height">;
type TableRow = Pick<
  Database["public"]["Tables"]["tables"]["Row"],
  "id" | "floor_id" | "number" | "capacity" | "shape" | "position_x" | "position_y" | "width" | "height" | "rotation" | "status" | "active"
>;

export function FloorEditor({ floors, tables }: { floors: Floor[]; tables: TableRow[] }) {
  const [localTables, setLocalTables] = useState<TableRow[]>(tables);
  const [activeFloor, setActiveFloor] = useState(floors[0]?.id ?? "");
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalTables(tables);
    setDirty(false);
  }, [tables]);

  const shown = useMemo(
    () => localTables.filter((t) => t.floor_id === activeFloor && t.active),
    [localTables, activeFloor],
  );
  const selected = localTables.find((t) => t.id === selectedId) ?? null;

  function handleDragEnd(ev: DragEndEvent) {
    const id = String(ev.active.id);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = ev.delta.x / rect.width;
    const dy = ev.delta.y / rect.height;
    setLocalTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              position_x: clamp01(t.position_x + dx, t.width),
              position_y: clamp01(t.position_y + dy, t.height),
            }
          : t,
      ),
    );
    setDirty(true);
  }

  function clamp01(v: number, size: number) {
    return Math.max(0, Math.min(1 - size, v));
  }

  function patchSelected(patch: Partial<TableRow>) {
    if (!selectedId) return;
    setLocalTables((prev) => prev.map((t) => (t.id === selectedId ? { ...t, ...patch } : t)));
    setDirty(true);
  }

  function save() {
    start(async () => {
      const res = await updateTablePositions(
        shown.map((t) => ({
          id: t.id,
          position_x: Number(t.position_x),
          position_y: Number(t.position_y),
          width: Number(t.width),
          height: Number(t.height),
          rotation: Number(t.rotation),
          shape: t.shape,
        })),
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Distribución guardada");
      setDirty(false);
    });
  }

  function addTable() {
    start(async () => {
      const res = await addTableToFloor(activeFloor);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Mesa agregada");
      window.location.reload();
    });
  }

  function newFloor() {
    const name = prompt("Nombre del piso (ej: Terraza)");
    if (!name) return;
    start(async () => {
      const res = await createFloor({ name });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Piso creado");
      window.location.reload();
    });
  }

  function removeTable(id: string) {
    if (!confirm("¿Desactivar esta mesa?")) return;
    start(async () => {
      const res = await deleteTable(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Mesa removida");
      setLocalTables((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 card-soft px-1 py-1">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFloor(f.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold rounded-lg transition",
                activeFloor === f.id ? "bg-hub-forest-700 text-hub-cream" : "text-hub-forest-700 hover:bg-hub-forest-50",
              )}
            >
              {f.name}
            </button>
          ))}
          <button
            type="button"
            onClick={newFloor}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg text-hub-forest-500 hover:bg-hub-forest-50"
            title="Nuevo piso"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={addTable}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white shadow-sm border border-hub-forest-100 text-sm font-semibold text-hub-forest-700"
        >
          <Plus className="w-4 h-4" />
          Mesa
        </button>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={save}
          className={cn(
            "ml-auto flex items-center gap-1 px-4 py-2 rounded-xl font-semibold shadow-sm transition",
            dirty ? "bg-hub-orange-500 text-white" : "bg-white text-hub-slate border border-hub-forest-100",
          )}
        >
          <Save className="w-4 h-4" />
          {dirty ? "Guardar cambios" : "Sin cambios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <DndContext onDragEnd={handleDragEnd}>
          <div
            ref={containerRef}
            className="relative aspect-[4/3] rounded-2xl bg-white/70 border-2 border-dashed border-hub-forest-100 overflow-hidden"
            onClick={() => setSelectedId(null)}
          >
            {shown.map((t) => (
              <DraggableTable
                key={t.id}
                table={t}
                selected={t.id === selectedId}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
            {shown.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-hub-slate text-sm">
                Sin mesas en este piso. Tocá <b className="mx-1">+ Mesa</b>
              </div>
            )}
          </div>
        </DndContext>

        <aside className="card-soft p-3 h-fit">
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-display text-3xl text-hub-forest-700">Mesa {selected.number}</div>
                <button
                  type="button"
                  onClick={() => removeTable(selected.id)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Field label="Forma">
                <div className="flex gap-2">
                  <ShapeBtn active={selected.shape === "square"} onClick={() => patchSelected({ shape: "square" })}>
                    <Square className="w-4 h-4" /> Cuadrada
                  </ShapeBtn>
                  <ShapeBtn active={selected.shape === "rect"} onClick={() => patchSelected({ shape: "rect" })}>
                    Rectangular
                  </ShapeBtn>
                  <ShapeBtn active={selected.shape === "circle"} onClick={() => patchSelected({ shape: "circle" })}>
                    <Circle className="w-4 h-4" /> Redonda
                  </ShapeBtn>
                </div>
              </Field>
              <Field label="Ancho">
                <input
                  type="range"
                  min={0.05}
                  max={0.35}
                  step={0.005}
                  value={Number(selected.width)}
                  onChange={(e) => patchSelected({ width: Number(e.target.value) })}
                />
              </Field>
              <Field label="Alto">
                <input
                  type="range"
                  min={0.05}
                  max={0.35}
                  step={0.005}
                  value={Number(selected.height)}
                  onChange={(e) => patchSelected({ height: Number(e.target.value) })}
                />
              </Field>
              <Field label="Rotación">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    value={Number(selected.rotation)}
                    onChange={(e) => patchSelected({ rotation: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() => patchSelected({ rotation: 0 })}
                    className="p-1.5 rounded-lg bg-white border border-hub-forest-100"
                    aria-label="Reset rotación"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Field>
              <Field label="Capacidad">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-hub-slate" />
                  <input
                    type="number"
                    value={selected.capacity}
                    min={1}
                    onChange={(e) => patchSelected({ capacity: Number(e.target.value) })}
                    className="w-20 px-2 py-1 rounded border border-hub-forest-100 text-center"
                  />
                </div>
              </Field>
            </div>
          ) : (
            <div className="text-sm text-hub-slate">
              Tocá una mesa para editar sus propiedades. Arrastrá para reubicar.
            </div>
          )}
        </aside>
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

function ShapeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition",
        active ? "bg-hub-forest-700 text-hub-cream" : "bg-white text-hub-forest-700 border border-hub-forest-100",
      )}
    >
      {children}
    </button>
  );
}

function DraggableTable({
  table,
  selected,
  onClick,
}: {
  table: TableRow;
  selected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="table-chip absolute"
      data-status={table.status}
      style={{
        left: `${Number(table.position_x) * 100}%`,
        top: `${Number(table.position_y) * 100}%`,
        width: `${Number(table.width) * 100}%`,
        height: `${Number(table.height) * 100}%`,
        transform: `translate3d(${transform?.x ?? 0}px, ${transform?.y ?? 0}px, 0) rotate(${table.rotation}deg)`,
        borderRadius: table.shape === "circle" ? "50%" : "12px",
        outline: selected ? "3px solid #E76F51" : "none",
        outlineOffset: "2px",
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: selected ? 10 : 1,
      }}
    >
      <span className="font-display text-2xl leading-none">{table.number}</span>
      <span className="mt-1 text-[10px] uppercase tracking-widest opacity-80">
        cap {table.capacity}
      </span>
    </button>
  );
}
