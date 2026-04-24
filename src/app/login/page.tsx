import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";
import { PinKeypad } from "./pin-keypad";

export default async function LoginPage() {
  const s = await readSessionFromCookies();
  if (s) redirect("/");
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-br from-hub-cream via-hub-cream-soft to-hub-forest-50 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle_at_30%_30%,#1B4332_2px,transparent_2px)] bg-[length:40px_40px]" />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <h1 className="font-display text-6xl text-hub-forest-700 tracking-tight mb-1">
          HUB!
        </h1>
        <p className="text-sm text-hub-slate mb-10 tracking-wide uppercase">
          Comandas · Mozos
        </p>
        <PinKeypad />
      </div>
      <footer className="absolute bottom-6 text-xs text-hub-slate">
        v0.1 · hecho con calma
      </footer>
    </main>
  );
}
