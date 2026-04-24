import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth/session";

export default async function Home() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");
  if (session.role === "kitchen" || session.role === "bar") {
    redirect("/kds");
  }
  if (session.role === "admin" || session.role === "manager") {
    redirect("/admin");
  }
  redirect("/mozo");
}
