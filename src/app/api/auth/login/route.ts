import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import { verifyAdminAuth } from "@/lib/auth";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/adminSession";

const INSECURE_DEFAULT = "admin_secret_hub_master_key_change_me";

// Simple brute-force protection: max 8 failed attempts per IP per 15 minutes
const failures = new LRUCache<string, number>({ max: 1000, ttl: 15 * 60 * 1000 });

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_API_KEY?.trim();
  if (!secret || (process.env.NODE_ENV === "production" && secret === INSECURE_DEFAULT)) {
    return NextResponse.json(
      { success: false, error: "Server misconfigured: set a strong ADMIN_API_KEY in the environment." },
      { status: 500 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if ((failures.get(ip) || 0) >= 8) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password || "");
  } catch {
    /* ignore */
  }

  if (!password || !verifyAdminAuth(`Bearer ${password}`)) {
    failures.set(ip, (failures.get(ip) || 0) + 1);
    return NextResponse.json({ success: false, error: "Invalid admin key" }, { status: 401 });
  }

  failures.delete(ip);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

