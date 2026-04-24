"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, Users, Tv2, ClipboardList } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export function TopBar({
  waiterName,
  role,
  branchName,
}: {
  waiterName: string;
  role: string;
  branchName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const showAdminLink = role === "admin" || role === "manager";
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 bg-hub-forest-700 text-hub-cream shadow-md">
      <div className="px-4 py-2 flex items-center gap-3 pt-safe">
        <div className="font-display text-2xl leading-none tracking-tight">
          HUB!
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-widest opacity-70">
            {branchName}
          </span>
          <span className="text-sm font-medium">{waiterName}</span>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/mozo"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              pathname?.startsWith("/mozo")
                ? "bg-hub-cream text-hub-forest-700"
                : "hover:bg-hub-forest-900/40"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Mesas</span>
          </Link>
          {(role === "kitchen" || role === "bar" || role === "admin" || role === "manager") && (
            <Link
              href="/kds"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname?.startsWith("/kds")
                  ? "bg-hub-cream text-hub-forest-700"
                  : "hover:bg-hub-forest-900/40"
              }`}
            >
              <Tv2 className="w-4 h-4" />
              <span className="hidden sm:inline">KDS</span>
            </Link>
          )}
          {showAdminLink && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isAdmin
                  ? "bg-hub-cream text-hub-forest-700"
                  : "hover:bg-hub-forest-900/40"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-hub-forest-900/40 transition"
            onClick={async () => {
              await logout();
              router.refresh();
            }}
            aria-label="Salir"
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}

// Unused import guard — kept for future use of Users icon in team views
void Users;
