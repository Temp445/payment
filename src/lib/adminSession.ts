/**
 * Admin session tokens (edge + node compatible, Web Crypto only).
 * Token format: `<expiryEpochSeconds>.<hexHmacSha256>` signed with ADMIN_API_KEY.
 * The cookie is httpOnly, so the admin key / token is never readable by page JS.
 */
export const ADMIN_COOKIE = "hub_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmacHex(secret, `admin:${exp}`);
  return `${exp}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret: string | undefined
): Promise<boolean> {
  if (!token || !secret) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(secret, `admin:${exp}`);
  return constantTimeEqual(sig, expected);
}

