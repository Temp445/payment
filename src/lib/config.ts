import { prisma } from "./prisma";
import { logger } from "./logger";

interface HubConfigCache {
  hubUrl: string;
  adminApiKey: string;
  lastFetched: number;
}

const CACHE_TTL_MS = 30 * 1000; // 30-second in-memory cache

let cachedConfig: HubConfigCache = {
  hubUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  adminApiKey: process.env.ADMIN_API_KEY || "admin_secret_hub_master_key_change_me",
  lastFetched: 0,
};

let initPromise: Promise<void> | null = null;

/**
 * Format and deduplicate comma- or newline-separated URLs
 */
export function cleanMultiUrls(input: string): string {
  const seen = new Set<string>();
  return input
    .split(/[,\n]+/)
    .map((u) => u.trim().replace(/\/$/, ""))
    .filter((u) => {
      if (u.length === 0 || seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .join(", ");
}

/**
 * Initializes database config if empty, otherwise loads the database values into memory.
 */
export async function initHubConfig(): Promise<void> {
  try {
    const rows = await prisma.paymentHubConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const row of rows) {
      configMap[row.key] = row.value;
    }

    const defaultHubUrl = cleanMultiUrls(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000, http://localhost:3002");
    const defaultAdminKey = (process.env.ADMIN_API_KEY || "admin_secret_hub_master_key_change_me").trim();

    // If hub_url is not in database, seed it once
    if (!configMap["hub_url"]) {
      await prisma.paymentHubConfig.upsert({
        where: { key: "hub_url" },
        update: { value: defaultHubUrl },
        create: { key: "hub_url", value: defaultHubUrl },
      });
      configMap["hub_url"] = defaultHubUrl;
    }

    // If admin_api_key is not in database, seed it once
    if (!configMap["admin_api_key"]) {
      await prisma.paymentHubConfig.upsert({
        where: { key: "admin_api_key" },
        update: { value: defaultAdminKey },
        create: { key: "admin_api_key", value: defaultAdminKey },
      });
      configMap["admin_api_key"] = defaultAdminKey;
    }

    cachedConfig = {
      hubUrl: cleanMultiUrls(configMap["hub_url"]),
      adminApiKey: configMap["admin_api_key"].trim(),
      lastFetched: Date.now(),
    };

    logger.info(`Loaded payment_hub_config from database: hub_url=${cachedConfig.hubUrl}`);
  } catch (err: any) {
    logger.warn(`Failed to init payment_hub_config from database: ${err.message}`);
  }
}

/**
 * Save Hub URL (supports multiple comma-separated URLs) and Admin API Key.
 */
export async function saveHubConfig(params: {
  hubUrl?: string;
  adminApiKey?: string;
}): Promise<{ hubUrl: string; adminApiKey: string }> {
  const updates: Promise<any>[] = [];

  let newHubUrl = cachedConfig.hubUrl;
  let newAdminKey = cachedConfig.adminApiKey;

  if (params.hubUrl && params.hubUrl.trim().length > 0) {
    newHubUrl = cleanMultiUrls(params.hubUrl);
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "hub_url" },
        update: { value: newHubUrl },
        create: { key: "hub_url", value: newHubUrl },
      })
    );
  }

  if (params.adminApiKey && params.adminApiKey.trim().length > 0) {
    newAdminKey = params.adminApiKey.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "admin_api_key" },
        update: { value: newAdminKey },
        create: { key: "admin_api_key", value: newAdminKey },
      })
    );
  }

  await Promise.all(updates);

  // Update memory cache immediately
  cachedConfig = {
    hubUrl: newHubUrl,
    adminApiKey: newAdminKey,
    lastFetched: Date.now(),
  };

  logger.info(`Updated payment_hub_config in database: hub_url=${newHubUrl}`);
  return { hubUrl: newHubUrl, adminApiKey: newAdminKey };
}

/**
 * Return array of all configured Hub URLs
 */
export function getHubUrls(): string[] {
  ensureBackgroundInit();
  return cachedConfig.hubUrl
    .split(/[,\n]+/)
    .map((u) => u.trim().replace(/\/$/, ""))
    .filter((u) => u.length > 0);
}

/**
 * Fetch latest config from database
 */
export async function getHubConfig(): Promise<{ hubUrl: string; adminApiKey: string }> {
  const now = Date.now();
  if (now - cachedConfig.lastFetched < CACHE_TTL_MS) {
    return { hubUrl: cachedConfig.hubUrl, adminApiKey: cachedConfig.adminApiKey };
  }

  try {
    const rows = await prisma.paymentHubConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const row of rows) {
      configMap[row.key] = row.value;
    }

    const hubUrl = cleanMultiUrls(configMap["hub_url"] || cachedConfig.hubUrl);
    const adminApiKey = (configMap["admin_api_key"] || cachedConfig.adminApiKey).trim();

    cachedConfig = {
      hubUrl,
      adminApiKey,
      lastFetched: now,
    };

    return { hubUrl, adminApiKey };
  } catch (err: any) {
    return {
      hubUrl: cachedConfig.hubUrl,
      adminApiKey: cachedConfig.adminApiKey,
    };
  }
}

/**
 * Synchronous getter. If a preferredOrigin is passed (e.g. from current request),
 * it returns that origin if it matches one of the configured URLs, otherwise returns primary.
 */
export function getCachedHubUrl(preferredOrigin?: string): string {
  ensureBackgroundInit();
  const list = getHubUrls();

  if (preferredOrigin) {
    const cleanPreferred = preferredOrigin.trim().replace(/\/$/, "");
    if (list.includes(cleanPreferred)) {
      return cleanPreferred;
    }
    // Also accept if it's a valid localhost port or Netlify URL
    if (cleanPreferred.startsWith("http://") || cleanPreferred.startsWith("https://")) {
      return cleanPreferred;
    }
  }

  return list[0] || "http://localhost:3000";
}

/**
 * Synchronous getter for Admin API Key using memory cache
 */
export function getCachedAdminApiKey(): string {
  ensureBackgroundInit();
  return cachedConfig.adminApiKey;
}

function ensureBackgroundInit() {
  if (!initPromise && cachedConfig.lastFetched === 0) {
    initPromise = initHubConfig();
  }
}

ensureBackgroundInit();
