"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function RegisterSW() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt || installed) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const r = await prompt.userChoice;
        if (r.outcome === "accepted") setPrompt(null);
      }}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-hub-orange-500 text-white shadow-lg text-sm font-semibold"
    >
      <Download className="w-4 h-4" />
      Instalar HUB!
    </button>
  );
}
