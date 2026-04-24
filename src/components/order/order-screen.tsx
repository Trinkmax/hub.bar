"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Users,
  Clock3,
  Trash2,
  Plus,
  Minus,
  Send,
  Receipt,
  CheckCircle2,
  Hourglass,
  Flame,
  X,
  ShoppingCart,
  Split as SplitIcon,
} from "lucide-react";
import { CloseSheet } from "@/components/order/close-sheet";
import { SplitSheet } from "@/components/order/split-sheet";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/icon";
import { cn, formatARS, minutesSince } from "@/lib/utils";
import {
  addItemToOrder,
  removeDraftItem,
  sendToStations,
  requestBill,
  closeOrder,
  updateItemQty,
} from "@/lib/actions/orders";
import type { Database } from "@/lib/db/types";

type Enums = Database["public"]["Enums"];
type Order = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "branch_id" | "table_id" | "waiter_id" | "status" | "opened_at" | "guest_count" | "subtotal" | "total" | "tip_amount"
>;
type TableRow = Pick<Database["public"]["Tables"]["tables"]["Row"], "id" | "number" | "capacity" | "floor_id">;
type OrderItem = Pick<
  Database["public"]["Tables"]["order_items"]["Row"],
  "id" | "menu_item_id" | "variant_id" | "combo_id" | "name_snapshot" | "qty" | "unit_price" | "mods_total" | "line_total" | "station" | "status" | "notes_free_text" | "sent_at" | "ready_at" | "served_at" | "created_at"
> & { order_item_modifiers: Array<{ id: string; name_snapshot: string; price_delta_snapshot: number }> };
type Category = Pick<Database["public"]["Tables"]["menu_categories"]["Row"], "id" | "name" | "slug" | "icon" | "color" | "sort_order">;
type MenuItem = Pick<Database["public"]["Tables"]["menu_items"]["Row"], "id" | "category_id" | "name" | "description" | "base_price" | "station" | "tags" | "active" | "sort_order">;
type Variant = Pick<Database["public"]["Tables"]["menu_item_variants"]["Row"], "id" | "item_id" | "name" | "price_delta" | "is_default" | "sort_order" | "active">;
type ModGroup = Pick<Database["public"]["Tables"]["modifier_groups"]["Row"], "id" | "name" | "min_select" | "max_select" | "required" | "sort_order">;
type Mod = Pick<Database["public"]["Tables"]["modifiers"]["Row"], "id" | "group_id" | "name" | "price_delta" | "sort_order" | "active">;
type MIM = { item_id: string; group_id: string; sort_order: number };

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function OrderScreen(props: {
  order: Order;
  table: TableRow;
  initialItems: OrderItem[];
  categories: Category[];
  menuItems: MenuItem[];
  variants: Variant[];
  modifierGroups: ModGroup[];
  modifiers: Mod[];
  menuItemModifierGroups: MIM[];
}) {
  const {
    order,
    table,
    initialItems,
    categories,
    menuItems,
    variants,
    modifierGroups,
    modifiers,
    menuItemModifierGroups,
  } = props;

  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  // Refresh items from server periodically (cheap polling until we wire Realtime).
  // TODO: wire Supabase Realtime channel order:{id}
  const refresh = () => router.refresh();

  const variantsByItem = useMemo(() => {
    const map: Record<string, Variant[]> = {};
    for (const v of variants) (map[v.item_id] ||= []).push(v);
    return map;
  }, [variants]);

  const modGroupsByItem = useMemo(() => {
    const byGroup = new Map(modifierGroups.map((g) => [g.id, g]));
    const modsByGroup: Record<string, Mod[]> = {};
    for (const m of modifiers) (modsByGroup[m.group_id] ||= []).push(m);
    const map: Record<string, Array<ModGroup & { modifiers: Mod[] }>> = {};
    for (const rel of menuItemModifierGroups) {
      const g = byGroup.get(rel.group_id);
      if (!g) continue;
      (map[rel.item_id] ||= []).push({ ...g, modifiers: modsByGroup[g.id] ?? [] });
    }
    return map;
  }, [modifierGroups, modifiers, menuItemModifierGroups]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const i of menuItems) (map[i.category_id] ||= []).push(i);
    return map;
  }, [menuItems]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = normalize(query);
    return menuItems
      .filter((i) => {
        const hay = normalize(`${i.name} ${i.description ?? ""} ${(i.tags ?? []).join(" ")}`);
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [query, menuItems]);

  const draftItems = items.filter((i) => i.status === "draft");
  const sentItems = items.filter((i) => i.status !== "draft");
  const cartSubtotal = draftItems.reduce((s, i) => s + Number(i.line_total || 0), 0);
  const orderTotal = items
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + Number(i.line_total || 0), 0);
  const mins = minutesSince(order.opened_at);
  void now;

  async function handleAdd(payload: Parameters<typeof addItemToOrder>[0]) {
    const res = await addItemToOrder(payload);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // Optimistic add
    setItems((prev) => [
      ...prev,
      {
        id: res.itemId,
        menu_item_id: payload.menuItemId ?? null,
        variant_id: payload.variantId ?? null,
        combo_id: payload.comboId ?? null,
        name_snapshot: payload.nameSnapshot,
        qty: payload.qty,
        unit_price: payload.unitPrice,
        mods_total: payload.modifiers.reduce((s, m) => s + m.priceDelta, 0),
        line_total:
          (payload.unitPrice + payload.modifiers.reduce((s, m) => s + m.priceDelta, 0)) *
          payload.qty,
        station: payload.station,
        status: "draft",
        notes_free_text: payload.notes ?? null,
        sent_at: null,
        ready_at: null,
        served_at: null,
        created_at: new Date().toISOString(),
        order_item_modifiers: payload.modifiers.map((m) => ({
          id: Math.random().toString(36).slice(2),
          name_snapshot: m.name,
          price_delta_snapshot: m.priceDelta,
        })),
      },
    ]);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  async function handleRemove(id: string) {
    const res = await removeDraftItem(id);
    if (!res.ok) return toast.error(res.error);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleQty(id: string, qty: number) {
    if (qty < 1) return handleRemove(id);
    const res = await updateItemQty(id, qty);
    if (!res.ok) return toast.error(res.error);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              qty,
              line_total: (Number(i.unit_price) + Number(i.mods_total)) * qty,
            }
          : i,
      ),
    );
  }

  function handleSend() {
    start(async () => {
      const res = await sendToStations(order.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Enviado: ${res.sent} ítem(s)`);
      if (navigator.vibrate) navigator.vibrate(40);
      refresh();
    });
  }

  function handleRequestBill() {
    start(async () => {
      const res = await requestBill(order.id);
      if (!res.ok) {
        toast.error("No se pudo pedir la cuenta");
        return;
      }
      toast.success("Cuenta pedida");
      router.push("/mozo");
    });
  }

  function handleClose() {
    setCloseOpen(true);
  }
  void closeOrder; // close action lives inside CloseSheet

  const showBillBtn = order.status === "open" || order.status === "sent";
  const showCloseBtn = order.status === "bill_requested" || sentItems.length > 0;

  return (
    <div className="flex flex-col flex-1 bg-hub-cream min-h-0">
      <div className="sticky top-0 z-30 bg-hub-forest-700 text-hub-cream shadow-md">
        <div className="px-3 py-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/mozo")}
            className="p-2 rounded-full hover:bg-hub-forest-900/40"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 leading-tight">
            <div className="font-display text-3xl">Mesa {table.number}</div>
            <div className="flex items-center gap-3 text-xs opacity-85">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {order.guest_count}
              </span>
              <span className="flex items-center gap-1">
                <Clock3 className="w-3 h-3" />
                {mins}&apos;
              </span>
              <span className="capitalize">{order.status.replace("_", " ")}</span>
            </div>
          </div>
          <div className="text-right font-display text-2xl">
            {formatARS(orderTotal)}
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-hub-slate" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              inputMode="search"
              placeholder="Buscar ítem…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-hub-cream text-hub-ink text-base focus:outline-none focus:ring-2 focus:ring-hub-orange-500 shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-hub-slate"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!query && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-2 scroll-x-hidden-bar">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition",
                  activeCategory === c.id
                    ? "bg-hub-cream text-hub-forest-700"
                    : "bg-hub-forest-900/30 text-hub-cream/80",
                )}
              >
                <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sent items summary (read-only, shows what's in kitchen already) */}
      {sentItems.length > 0 && (
        <div className="px-3 pt-3">
          <div className="card-soft p-3">
            <div className="text-xs uppercase tracking-widest text-hub-slate mb-2">
              Pedidos en curso
            </div>
            <ul className="flex flex-col divide-y divide-hub-forest-100">
              {sentItems.map((i) => (
                <li key={i.id} className="py-1.5 flex items-center gap-2 text-sm">
                  <StatusPill status={i.status} />
                  <span className="font-medium flex-1">
                    {i.qty}× {i.name_snapshot}
                  </span>
                  <span className="text-hub-slate">{formatARS(i.line_total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Item list */}
      <div className="flex-1 overflow-y-auto pt-3 pb-48">
        <div className="px-3 flex flex-col gap-2">
          {(filtered ?? itemsByCategory[activeCategory ?? ""] ?? []).map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                const vars = variantsByItem[it.id];
                const groups = modGroupsByItem[it.id];
                if ((vars && vars.length > 0) || (groups && groups.length > 0)) {
                  setSelectedItem(it);
                } else {
                  handleAdd({
                    orderId: order.id,
                    menuItemId: it.id,
                    variantId: null,
                    comboId: null,
                    qty: 1,
                    nameSnapshot: it.name,
                    unitPrice: Number(it.base_price),
                    station: it.station,
                    notes: null,
                    modifiers: [],
                  });
                  if (navigator.vibrate) navigator.vibrate(6);
                }
              }}
              className="card-soft p-3 flex items-start gap-3 text-left active:scale-[0.99] transition"
            >
              <div className="flex-1">
                <div className="font-semibold text-hub-ink">{it.name}</div>
                {it.description && (
                  <div className="text-xs text-hub-slate mt-0.5 line-clamp-2">
                    {it.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-hub-slate">
                  <span className="uppercase tracking-widest">
                    {it.station === "kitchen" ? "Cocina" : "Barra"}
                  </span>
                  {variantsByItem[it.id] && variantsByItem[it.id].length > 0 && (
                    <span>· variantes</span>
                  )}
                  {modGroupsByItem[it.id] && modGroupsByItem[it.id].length > 0 && (
                    <span>· personalizable</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg text-hub-forest-700">
                  {formatARS(it.base_price)}
                </div>
              </div>
            </button>
          ))}
          {((filtered ?? itemsByCategory[activeCategory ?? ""])?.length ?? 0) === 0 && (
            <div className="text-center text-sm text-hub-slate py-12">
              {query ? "Sin resultados" : "Vacío"}
            </div>
          )}
        </div>
      </div>

      {/* Bottom cart + actions */}
      <div className="fixed bottom-0 inset-x-0 bg-hub-cream border-t border-hub-forest-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
        <div className="px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm border border-hub-forest-100 font-medium text-hub-forest-700"
          >
            <ShoppingCart className="w-5 h-5" />
            {draftItems.length > 0 ? (
              <>
                <span className="absolute -top-1 -right-1 bg-hub-orange-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {draftItems.reduce((s, i) => s + i.qty, 0)}
                </span>
                <span>{formatARS(cartSubtotal)}</span>
              </>
            ) : (
              <span className="text-hub-slate">Carrito</span>
            )}
          </button>

          {draftItems.length > 0 ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="flex-1 h-12 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
            >
              <Send className="w-5 h-5" />
              Enviar a cocina/barra
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              {sentItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSplitOpen(true)}
                  className="h-12 px-3 rounded-xl bg-white border border-hub-forest-100 text-hub-forest-700 font-semibold flex items-center gap-1"
                  aria-label="Dividir"
                >
                  <SplitIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Dividir</span>
                </button>
              )}
              {showBillBtn && (
                <button
                  type="button"
                  onClick={handleRequestBill}
                  disabled={pending}
                  className="flex-1 h-12 rounded-xl bg-hub-orange-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
                >
                  <Receipt className="w-5 h-5" />
                  Pedir cuenta
                </button>
              )}
              {showCloseBtn && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="flex-1 h-12 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Cobrar / cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {closeOpen && (
        <CloseSheet
          orderId={order.id}
          subtotal={orderTotal}
          tipSuggestionPct={10}
          onClose={() => setCloseOpen(false)}
        />
      )}

      {splitOpen && (
        <SplitSheet
          orderId={order.id}
          items={sentItems.map((i) => ({
            id: i.id,
            name_snapshot: i.name_snapshot,
            qty: i.qty,
            line_total: Number(i.line_total),
            status: i.status,
          }))}
          onClose={() => setSplitOpen(false)}
        />
      )}

      {cartOpen && (
        <CartSheet
          items={draftItems}
          onClose={() => setCartOpen(false)}
          onRemove={handleRemove}
          onQty={handleQty}
          total={cartSubtotal}
        />
      )}

      {selectedItem && (
        <ItemSheet
          item={selectedItem}
          variants={variantsByItem[selectedItem.id] ?? []}
          modGroups={modGroupsByItem[selectedItem.id] ?? []}
          onCancel={() => setSelectedItem(null)}
          onConfirm={(payload) => {
            setSelectedItem(null);
            handleAdd({
              orderId: order.id,
              menuItemId: selectedItem.id,
              variantId: payload.variantId,
              comboId: null,
              qty: payload.qty,
              nameSnapshot: payload.displayName,
              unitPrice: payload.unitPrice,
              station: selectedItem.station,
              notes: payload.notes,
              modifiers: payload.modifiers,
            });
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Enums["order_item_status"] }) {
  const map: Record<Enums["order_item_status"], { label: string; icon: React.ReactNode; className: string }> = {
    draft: { label: "Borrador", icon: null, className: "bg-gray-200 text-gray-700" },
    sent: { label: "Enviado", icon: <Send className="w-3 h-3" />, className: "bg-blue-100 text-blue-700" },
    preparing: { label: "Cocinando", icon: <Flame className="w-3 h-3" />, className: "bg-amber-100 text-amber-700" },
    ready: { label: "Listo", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-100 text-green-700" },
    served: { label: "Servido", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-hub-forest-100 text-hub-forest-700" },
    cancelled: { label: "Cancelado", icon: <X className="w-3 h-3" />, className: "bg-red-100 text-red-700" },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
        m.className,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function ItemSheet({
  item,
  variants,
  modGroups,
  onCancel,
  onConfirm,
}: {
  item: MenuItem;
  variants: Variant[];
  modGroups: Array<ModGroup & { modifiers: Mod[] }>;
  onCancel: () => void;
  onConfirm: (payload: {
    variantId: string | null;
    qty: number;
    displayName: string;
    unitPrice: number;
    notes: string | null;
    modifiers: Array<{ modifierId: string | null; name: string; priceDelta: number }>;
  }) => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [variantId, setVariantId] = useState<string | null>(
    variants.find((v) => v.is_default)?.id ?? variants[0]?.id ?? null,
  );
  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({});

  const variant = variants.find((v) => v.id === variantId);
  const unitPrice = Number(item.base_price) + Number(variant?.price_delta ?? 0);
  const displayName = variant ? `${item.name} · ${variant.name}` : item.name;
  const modsTotal = modGroups.reduce((s, g) => {
    const ids = selectedMods[g.id] ?? [];
    return s + g.modifiers.filter((m) => ids.includes(m.id)).reduce((a, b) => a + Number(b.price_delta), 0);
  }, 0);
  const total = (unitPrice + modsTotal) * qty;

  const canSubmit = modGroups.every((g) => {
    const n = (selectedMods[g.id] ?? []).length;
    return n >= g.min_select && n <= g.max_select;
  });

  function toggleMod(groupId: string, modId: string, single: boolean) {
    setSelectedMods((prev) => {
      const cur = prev[groupId] ?? [];
      if (cur.includes(modId)) {
        return { ...prev, [groupId]: cur.filter((x) => x !== modId) };
      }
      const grp = modGroups.find((g) => g.id === groupId)!;
      const next = single ? [modId] : [...cur, modId];
      return { ...prev, [groupId]: next.slice(-grp.max_select) };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-hub-ink/50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-lg bg-hub-cream rounded-t-3xl sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-hub-forest-100">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-hub-slate">
                {item.station === "kitchen" ? "Cocina" : "Barra"}
              </div>
              <div className="font-display text-3xl text-hub-forest-700 leading-tight">
                {item.name}
              </div>
              {item.description && (
                <div className="text-sm text-hub-slate mt-1">{item.description}</div>
              )}
            </div>
            <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-black/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {variants.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest text-hub-slate mb-2">
                Variante
              </div>
              <div className="grid grid-cols-3 gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "rounded-xl border-2 py-2 text-sm font-semibold transition",
                      variantId === v.id
                        ? "bg-hub-forest-700 text-hub-cream border-hub-forest-700"
                        : "bg-white text-hub-ink border-hub-forest-100",
                    )}
                  >
                    <div>{v.name}</div>
                    {Number(v.price_delta) !== 0 && (
                      <div className="text-[10px] opacity-80">
                        {Number(v.price_delta) > 0 ? "+" : ""}
                        {formatARS(v.price_delta)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {modGroups.map((g) => {
            const single = g.max_select === 1;
            return (
              <section key={g.id}>
                <div className="text-xs uppercase tracking-widest text-hub-slate mb-2 flex items-center justify-between">
                  <span>{g.name}</span>
                  <span className="normal-case tracking-normal text-[10px]">
                    {g.required ? "Obligatorio" : "Opcional"} · min {g.min_select} · max {g.max_select}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.modifiers.map((m) => {
                    const on = (selectedMods[g.id] ?? []).includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMod(g.id, m.id, single)}
                        className={cn(
                          "rounded-xl border-2 py-2 px-3 text-sm text-left transition",
                          on
                            ? "bg-hub-forest-700 text-hub-cream border-hub-forest-700"
                            : "bg-white text-hub-ink border-hub-forest-100",
                        )}
                      >
                        <div className="font-semibold">{m.name}</div>
                        {Number(m.price_delta) !== 0 && (
                          <div className="text-[10px] opacity-80">
                            {Number(m.price_delta) > 0 ? "+" : ""}
                            {formatARS(m.price_delta)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section>
            <div className="text-xs uppercase tracking-widest text-hub-slate mb-2">
              Aclaraciones
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: sin cebolla, punto jugoso…"
              className="w-full rounded-xl bg-white border border-hub-forest-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-hub-orange-500"
            />
          </section>

          <section className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-hub-slate">Cantidad</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-11 h-11 rounded-full bg-white border border-hub-forest-100 shadow-sm active:scale-95"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="w-4 h-4 mx-auto" />
              </button>
              <div className="w-10 text-center font-display text-2xl">{qty}</div>
              <button
                type="button"
                className="w-11 h-11 rounded-full bg-white border border-hub-forest-100 shadow-sm active:scale-95"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-hub-forest-100 bg-white/70">
          <button
            type="button"
            disabled={!canSubmit}
            className="w-full h-14 rounded-2xl bg-hub-forest-700 text-hub-cream font-semibold text-base flex items-center justify-between px-5 active:scale-[0.99] disabled:opacity-60"
            onClick={() =>
              onConfirm({
                variantId,
                qty,
                displayName,
                unitPrice,
                notes: notes.trim() || null,
                modifiers: modGroups.flatMap((g) =>
                  (selectedMods[g.id] ?? [])
                    .map((mid) => g.modifiers.find((m) => m.id === mid))
                    .filter((m): m is Mod => !!m)
                    .map((m) => ({
                      modifierId: m.id,
                      name: `${g.name}: ${m.name}`,
                      priceDelta: Number(m.price_delta),
                    })),
                ),
              })
            }
          >
            <span className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Agregar
            </span>
            <span className="font-display text-2xl">{formatARS(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSheet({
  items,
  onClose,
  onRemove,
  onQty,
  total,
}: {
  items: OrderItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onQty: (id: string, qty: number) => void;
  total: number;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-hub-ink/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-hub-cream rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex items-start justify-between border-b border-hub-forest-100">
          <div>
            <div className="text-xs uppercase tracking-widest text-hub-slate">Carrito (borrador)</div>
            <div className="font-display text-3xl text-hub-forest-700">
              {items.reduce((s, i) => s + i.qty, 0)} ítem(s)
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-10 text-center text-hub-slate">
              <Hourglass className="w-8 h-8 mx-auto mb-2 opacity-60" />
              Carrito vacío
            </div>
          ) : (
            <ul className="divide-y divide-hub-forest-100">
              {items.map((i) => (
                <li key={i.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-hub-ink leading-tight">
                      {i.name_snapshot}
                    </div>
                    {i.order_item_modifiers.length > 0 && (
                      <ul className="mt-1 text-xs text-hub-slate space-y-0.5">
                        {i.order_item_modifiers.map((m) => (
                          <li key={m.id}>+ {m.name_snapshot}</li>
                        ))}
                      </ul>
                    )}
                    {i.notes_free_text && (
                      <div className="mt-1 text-xs italic text-hub-orange-700">
                        “{i.notes_free_text}”
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onQty(i.id, i.qty - 1)}
                        className="w-8 h-8 rounded-full bg-white shadow-sm border border-hub-forest-100"
                      >
                        <Minus className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <div className="w-7 text-center font-semibold">{i.qty}</div>
                      <button
                        type="button"
                        onClick={() => onQty(i.id, i.qty + 1)}
                        className="w-8 h-8 rounded-full bg-white shadow-sm border border-hub-forest-100"
                      >
                        <Plus className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(i.id)}
                        className="ml-auto p-2 text-hub-slate hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-display text-lg text-hub-forest-700">
                    {formatARS(i.line_total)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-5 border-t border-hub-forest-100 bg-white/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-hub-slate">Subtotal borrador</span>
            <span className="font-display text-2xl">{formatARS(total)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-hub-forest-700 text-hub-cream font-semibold"
          >
            Seguir agregando
          </button>
        </div>
      </div>
    </div>
  );
}
