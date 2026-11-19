import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.ADMIN_API_KEY?.trim();

  // If internal browser requests to /api/* lack an Authorization header,
  // attach the server environment's admin key automatically.
  if (pathname.startsWith("/api/")) {
    if (secret && !req.headers.get("authorization")) {
      const headers = new Headers(req.headers);
      headers.set("authorization", `Bearer ${secret}`);
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
