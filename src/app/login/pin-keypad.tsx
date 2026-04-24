"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Delete } from "lucide-react";
import { loginWithPin } from "@/lib/actions/auth";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PinKeypad() {
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();
  const [shake, setShake] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  function vibrate(ms = 20) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  }

  function submit(finalPin: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pin", finalPin);
      const res = await loginWithPin(fd);
      if (!res.ok) {
        toast.error(res.error || "PIN incorrecto");
        setShake(true);
        vibrate(80);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 320);
        return;
      }
      vibrate(40);
      const next = searchParams.get("next") || "/";
      router.replace(next);
      router.refresh();
    });
  }

  function push(d: string) {
    if (pending) return;
    vibrate(12);
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length >= 4) {
      // Try after 4 digits; if wrong, user can keep typing (reset happens on fail)
      if (next.length === 4 || next.length === 6) submit(next);
    }
  }

  function back() {
    if (pending) return;
    vibrate(8);
    setPin((p) => p.slice(0, -1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (pending) return;
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter" && pin.length >= 4) submit(pin);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, pending]);

  return (
    <div
      className={`w-full flex flex-col items-center transition-transform ${shake ? "animate-[shake_0.32s_ease]" : ""}`}
    >
      <style>{`@keyframes shake {0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div className="flex gap-3 mb-8" aria-label="PIN">
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = i < pin.length;
          const active = i === pin.length;
          return (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ring-2 transition-all ${
                filled
                  ? "bg-hub-forest-700 ring-hub-forest-700 scale-110"
                  : active
                    ? "ring-hub-forest-300 bg-white"
                    : "ring-hub-forest-100 bg-white"
              }`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[18rem]">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            className="keypad-btn"
            onClick={() => push(d)}
            disabled={pending}
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          className="keypad-btn"
          onClick={() => push("0")}
          disabled={pending}
        >
          0
        </button>
        <button
          type="button"
          className="keypad-btn !bg-transparent !shadow-none !text-hub-slate"
          onClick={back}
          disabled={pending}
          aria-label="Borrar"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>

      {pending && (
        <p className="mt-6 text-sm text-hub-slate animate-pulse">
          verificando…
        </p>
      )}
    </div>
  );
}
