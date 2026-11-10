import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface AuthenticatedApp {
  id: string;
  appCode: string;
  appName: string;
  webhookUrl: string | null;
  webhookSecret: string;
  isPublicClient?: boolean;
}

// In-memory cache for authenticated tenant apps
const appAuthCache = new LRUCache<string, AuthenticatedApp>({
  max: 500,
  ttl: 1000 * 60 * 5,
});

/**
 * Hash client secret with SHA-256
 */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Authenticate client application.
 * Supports:
 * 1. Backend Server-to-Server calls: Requires valid clientId AND clientSecret.
 * 2. Pure Browser-only Clients (React, Vue, SPAs): Allows order creation using only public clientId.
 */
export async function authenticateApplication(
  clientId: string | null,
  clientSecret: string | null
): Promise<AuthenticatedApp | null> {
  if (!clientId) {
    return null;
  }

  const isPublicClient = !clientSecret;
  const cacheKey = `${clientId}:${clientSecret || "public"}`;
  const cached = appAuthCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const app = await prisma.application.findUnique({
      where: { clientId },
      select: {
        id: true,
        appCode: true,
        appName: true,
        clientSecretHash: true,
        webhookUrl: true,
        webhookSecret: true,
        isActive: true,
      },
    });

    if (!app || !app.isActive) {
      return null;
    }

    // If clientSecret is provided, verify its hash (Server-to-Server)
    if (clientSecret) {
      const hashedInput = hashSecret(clientSecret);
      if (app.clientSecretHash !== hashedInput) {
        return null;
      }
    }

    const authenticatedApp: AuthenticatedApp = {
      id: app.id,
      appCode: app.appCode,
      appName: app.appName,
      webhookUrl: app.webhookUrl,
      webhookSecret: app.webhookSecret,
      isPublicClient,
    };

    appAuthCache.set(cacheKey, authenticatedApp);
    return authenticatedApp;
  } catch (error) {
    logger.error("Authentication DB lookup failed", error);
    return null;
  }
}

/**
 * Clear memory cache for tenant apps
 */
export function clearAppAuthCache() {
  appAuthCache.clear();
}

/**
 * Verify Master Admin API Key
 */
export function verifyAdminAuth(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const masterKey = process.env.ADMIN_API_KEY;
  if (!masterKey) return false;
  const tokenBuf = Buffer.from(token);
  const masterBuf = Buffer.from(masterKey);
  if (tokenBuf.length !== masterBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, masterBuf);
}
