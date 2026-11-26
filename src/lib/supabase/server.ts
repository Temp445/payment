import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_placeholder_key";

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can happen in Server Components, handled by middleware
        }
      },
    },
  });
}

/**
 * Fast, request-deduplicated user info from verified JWT claims (0ms local JWKS check
 * instead of a cross-region HTTPS round-trip to Supabase Auth on every page render).
 */
export const getSessionUser = cache(async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, any> | undefined;
  if (!claims) return null;
  return {
    id: claims.sub as string,
    email: claims.email as string | undefined,
    app_metadata: (claims.app_metadata || {}) as Record<string, any>,
    user_metadata: (claims.user_metadata || {}) as Record<string, any>,
  };
});

