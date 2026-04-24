import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión · HUB!" };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-hub-cream">
      <WifiOff className="w-14 h-14 text-hub-forest-700 mb-4" />
      <h1 className="font-display text-5xl text-hub-forest-700 mb-2">Sin conexión</h1>
      <p className="text-hub-slate max-w-xs">
        Conectate al Wi-Fi de HUB! para sincronizar las comandas. Las
        mesas guardadas se reanudarán automáticamente.
      </p>
    </main>
  );
}
