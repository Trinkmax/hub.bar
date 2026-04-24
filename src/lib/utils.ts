import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatARS(n: number | string | null | undefined) {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);
}

export function minutesSince(iso: string | Date) {
  const then = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 60_000));
}
