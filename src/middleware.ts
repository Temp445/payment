import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminSession";

/**
 * Protects the admin UI with a server-side session cookie.
 *  - Pages: redirect to /login unless a valid session cookie is present.
 *  - /api/*: if a valid session cookie is present and the request has no
 *    Authorization header, the server attaches the admin Bearer key itself, so the
 *    key never needs to exist in browser code. API clients (apps, cron, webhooks)
 *    keep authenticating with their own headers exactly as before.
 */
const PUBLIC_PAGE_PREFIXES = ["/login", "/checkout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.ADMIN_API_KEY?.trim();
  const hasSession = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, secret);

  if (pathname.startsWith("/api/")) {
    if (hasSession && secret && !req.headers.get("authorization")) {
      const headers = new Headers(req.headers);
      headers.set("authorization", `Bearer ${secret}`);
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

