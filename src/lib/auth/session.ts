import { cookies } from "next/headers";
import { verifyHubSession, type HubSessionClaims } from "@/lib/auth/jwt";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "hub_session";

export type HubSession = HubSessionClaims & {
  token: string;
  exp: number;
};

export async function readSessionFromCookies(): Promise<HubSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const parsed = await verifyHubSession(raw);
    return parsed as HubSession;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<HubSession> {
  const s = await readSessionFromCookies();
  if (!s) {
    throw new Error("UNAUTHENTICATED");
  }
  return s;
}
