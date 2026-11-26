import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Cache Supabase JWKS in module memory so middleware verifies JWTs locally with 0 network calls
let cachedJwks: { keys: any[] } | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getCachedJwks(supabaseUrl: string) {
  const now = Date.now();
  if (cachedJwks && now - jwksFetchedAt < JWKS_TTL_MS) {
    return cachedJwks;
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, {
      cache: "force-cache",
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.keys) && json.keys.length > 0) {
        cachedJwks = json;
        jwksFetchedAt = now;
        return cachedJwks;
      }
    }
  } catch {
    // Fall back to default getClaims() fetch
  }
  return undefined;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  // If Supabase key is not yet set in environment, allow access to prevent blocking setup
  if (!publishableKey) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  // 1. FAST PATH: All API routes handle their own authentication and return JSON.
  // NEVER redirect API routes to HTML login pages.
  if (pathname.startsWith("/api")) {
    return response;
  }

  // Public paths that do not require authentication
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/auth");

  const isPublicPage =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/guide");

  // Fast-path: Check if any Supabase auth cookies exist
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") || c.name.includes("auth-token")
  );

  // Bypass Supabase getUser network round-trip for public endpoints and unauthenticated visits
  if ((isPublicPage || isAuthPage) && !hasAuthCookie) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const jwks = await getCachedJwks(url);
  const { data: claimsData } = await supabase.auth.getClaims(undefined, jwks ? { jwks } : undefined);
  const claims = claimsData?.claims as Record<string, any> | undefined;

  // Handle unauthenticated visitors attempting to access protected routes
  if (!claims && !isAuthPage && !isPublicPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle authenticated users
  if (claims) {
    const appMeta = (claims.app_metadata || {}) as Record<string, any>;
    const userMeta = (claims.user_metadata || {}) as Record<string, any>;
    const isApproved = appMeta.is_approved === true || userMeta.is_approved === true;
    const status = appMeta.status || userMeta.status || (isApproved ? "ACTIVE" : "PENDING_APPROVAL");
    const role = (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase();

    // 1. Deactivated users cannot access the dashboard
    if (status === "DEACTIVATED") {
      if (isAuthPage) {
        return response;
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "Your account has been deactivated by an administrator.");
      return NextResponse.redirect(redirectUrl);
    }

    // 1b. Rejected users cannot access the dashboard
    if (status === "REJECTED") {
      if (isAuthPage) {
        return response;
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "Your account registration was rejected by an administrator.");
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Unapproved users cannot access the dashboard
    if (!isApproved || status === "PENDING_APPROVAL") {
      if (isAuthPage) {
        return response;
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "Your account is pending administrator approval.");
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Role-Based Access Control: Only explicit EMPLOYEE role is restricted from /settings
    const userRole = (appMeta.role || "").toUpperCase();
    if (userRole === "EMPLOYEE" && pathname.startsWith("/settings")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("error", "Access restricted to Administrators.");
      return NextResponse.redirect(redirectUrl);
    }

    // 4. Authenticated & approved user visiting login/signup pages redirected to dashboard
    if (isAuthPage && !pathname.startsWith("/reset-password") && !pathname.startsWith("/invite")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.delete("next");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
