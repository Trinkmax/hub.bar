// ESC/POS driver — client-side. Works over Web Bluetooth or Web USB.
// Only use from client components / browser context.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export type Align = "left" | "center" | "right";
export type Size = "normal" | "double" | "triple";

export class EscPos {
  private buf: number[] = [];

  static async fromBluetooth(): Promise<EscPos & { send: () => Promise<void> }> {
    type BtChar = { properties: { write?: boolean; writeWithoutResponse?: boolean }; writeValueWithoutResponse: (b: BufferSource) => Promise<void> };
    type BtSvc = { getCharacteristics: () => Promise<BtChar[]> };
    type BtDevice = { gatt?: { connect: () => Promise<{ getPrimaryServices: () => Promise<BtSvc[]> }> } };
    type BtNav = { bluetooth: { requestDevice: (opts: unknown) => Promise<BtDevice> } };
    if (!("bluetooth" in navigator)) {
      throw new Error("Web Bluetooth no soportado en este navegador.");
    }
    const device = await (navigator as unknown as BtNav).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "0000ffe0-0000-1000-8000-00805f9b34fb",
      ],
    });
    const server = await device.gatt!.connect();
    const services = await server.getPrimaryServices();
    let characteristic: BtChar | null = null;
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          characteristic = c;
          break;
        }
      }
      if (characteristic) break;
    }
    if (!characteristic) throw new Error("No se encontró característica de escritura BLE.");
    const pos = new EscPos();
    const result = Object.assign(pos, {
      send: async () => {
        const data = new Uint8Array(pos.buf);
        const chunkSize = 180;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          await characteristic!.writeValueWithoutResponse(chunk);
        }
        pos.buf = [];
      },
    });
    return result;
  }

  init() {
    this.buf.push(ESC, 0x40);
    return this;
  }

  align(a: Align) {
    this.buf.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
    return this;
  }

  bold(on: boolean) {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  size(s: Size) {
    const n = s === "normal" ? 0 : s === "double" ? 0x11 : 0x22;
    this.buf.push(GS, 0x21, n);
    return this;
  }

  text(s: string) {
    const enc = new TextEncoder();
    const bytes = enc.encode(s);
    for (const b of bytes) this.buf.push(b);
    return this;
  }

  line(s: string) {
    return this.text(s).newline();
  }

  newline(n = 1) {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  hr(width = 32) {
    return this.line("-".repeat(width));
  }

  feed(n = 3) {
    this.buf.push(ESC, 0x64, n);
    return this;
  }

  cut() {
    this.buf.push(GS, 0x56, 0x00);
    return this;
  }

  buffer() {
    return new Uint8Array(this.buf);
  }
}

export type StationTicketPayload = {
  branchName: string;
  tableNumber: number | string;
  waiterName: string;
  stationLabel: string;
  createdAt: string;
  items: Array<{
    qty: number;
    name: string;
    modifiers?: string[];
    notes?: string | null;
  }>;
};

export function buildStationTicket(p: StationTicketPayload): EscPos {
  const pos = new EscPos().init();
  pos.align("center").size("double").bold(true).line(p.branchName);
  pos.size("normal").bold(false).line(p.stationLabel).hr();
  pos.align("left").size("triple").bold(true).line(`MESA ${p.tableNumber}`);
  pos.size("normal").bold(false);
  pos.line(`Mozo: ${p.waiterName}`);
  pos.line(new Date(p.createdAt).toLocaleString("es-AR"));
  pos.hr();
  for (const it of p.items) {
    pos.bold(true).line(`${it.qty}x ${it.name}`).bold(false);
    for (const m of it.modifiers ?? []) pos.line(`  + ${m}`);
    if (it.notes) pos.line(`  ! ${it.notes}`);
  }
  pos.hr().feed(3).cut();
  return pos;
}

export type CustomerReceiptPayload = {
  branchName: string;
  tableNumber: number | string;
  waiterName: string;
  items: Array<{ qty: number; name: string; lineTotal: number }>;
  subtotal: number;
  serviceCharge: number;
  tipSuggestionPct: number;
  total: number;
};

export function buildCustomerReceipt(p: CustomerReceiptPayload): EscPos {
  const pos = new EscPos().init();
  pos.align("center").size("double").bold(true).line(p.branchName);
  pos.size("normal").bold(false).line("Ticket al cliente").hr();
  pos.align("left").line(`Mesa ${p.tableNumber}   Mozo ${p.waiterName}`).hr();
  for (const it of p.items) {
    pos.line(`${it.qty}x ${it.name}`);
    pos.align("right").line(fmt(it.lineTotal)).align("left");
  }
  pos.hr();
  pos.line(`Subtotal:   ${fmt(p.subtotal)}`);
  if (p.serviceCharge > 0) pos.line(`Servicio:   ${fmt(p.serviceCharge)}`);
  pos.bold(true).size("double").line(`TOTAL: ${fmt(p.total)}`).size("normal").bold(false);
  pos.hr();
  const tip = Math.round((p.subtotal * p.tipSuggestionPct) / 100);
  pos.align("center").line(`Propina sugerida ${p.tipSuggestionPct}%: ${fmt(tip)}`);
  pos.line("¡Gracias por visitarnos!").feed(3).cut();
  return pos;
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}
