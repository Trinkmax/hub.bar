import { SignJWT, jwtVerify } from "jose";
import type { Database } from "@/lib/db/types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

export interface HubSessionClaims {
  staff_id: string;
  branch_id: string;
  organization_id: string;
  role: StaffRole;
  full_name: string;
  session_id: string;
}

const DEFAULT_TTL_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 30);

function getSecretKey() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET missing. Copy it from Supabase → Settings → API → JWT Secret.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signHubSession(claims: HubSessionClaims, ttlDays = DEFAULT_TTL_DAYS) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlDays * 24 * 60 * 60;
  // We embed both our HUB claims and the Supabase-expected claims (role / sub),
  // so the same JWT authenticates against PostgREST and Realtime.
  return new SignJWT({
    ...claims,
    sub: claims.staff_id,
    aud: "authenticated",
    role: "authenticated",
    hub_role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(exp)
    .sign(getSecretKey());
}

export async function verifyHubSession(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    audience: "authenticated",
  });
  const {
    staff_id,
    branch_id,
    organization_id,
    hub_role,
    full_name,
    session_id,
  } = payload as Record<string, string>;
  if (!staff_id || !branch_id || !organization_id || !hub_role) {
    throw new Error("Invalid HUB session token");
  }
  return {
    staff_id,
    branch_id,
    organization_id,
    role: hub_role as StaffRole,
    full_name,
    session_id,
    token,
    exp: payload.exp ?? 0,
  };
}
