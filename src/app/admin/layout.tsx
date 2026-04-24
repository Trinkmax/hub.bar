import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TopBar } from "@/components/top-bar";
import { LayoutGrid, Utensils, Users, Printer, BarChart3 } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.role !== "manager") {
    redirect("/mozo");
  }
  const admin = getSupabaseAdmin();
  const { data: branch } = await admin
    .from("branches")
    .select("name")
    .eq("id", session.branch_id)
    .maybeSingle();

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar
        waiterName={session.full_name}
        role={session.role}
        branchName={branch?.name ?? "HUB!"}
      />
      <div className="flex flex-1">
        <aside className="hidden sm:flex flex-col w-56 bg-white/70 border-r border-hub-forest-100 p-3 gap-1">
          <NavLink href="/admin" label="Dashboard" icon={<BarChart3 className="w-4 h-4" />} />
          <NavLink href="/admin/floors" label="Pisos & Mesas" icon={<LayoutGrid className="w-4 h-4" />} />
          <NavLink href="/admin/menu" label="Menú" icon={<Utensils className="w-4 h-4" />} />
          <NavLink href="/admin/staff" label="Mozos" icon={<Users className="w-4 h-4" />} />
          <NavLink href="/admin/printers" label="Impresoras" icon={<Printer className="w-4 h-4" />} />
        </aside>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-hub-forest-50 text-hub-forest-700"
    >
      {icon}
      {label}
    </Link>
  );
}
