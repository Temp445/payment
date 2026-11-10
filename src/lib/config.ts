import { prisma } from "./prisma";
import { logger } from "./logger";

interface HubConfigCache {
  hubUrl: string;
  adminApiKey: string;
  cashfreeEnv: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeApiVersion: string;
  lastFetched: number;
}

const CACHE_TTL_MS = 30 * 1000; // 30-second in-memory cache

let cachedConfig: HubConfigCache = {
  hubUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  adminApiKey: process.env.ADMIN_API_KEY || "admin_secret_hub_master_key_change_me",
  cashfreeEnv: process.env.CASHFREE_ENV || "TEST",
  cashfreeAppId: process.env.CASHFREE_APP_ID || "",
  cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || "",
  cashfreeApiVersion: process.env.CASHFREE_API_VERSION || "2023-08-01",
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

    const defaultHubUrl = cleanMultiUrls(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000, http://localhost:3002"
    );
    const defaultAdminKey = (
      process.env.ADMIN_API_KEY || "admin_secret_hub_master_key_change_me"
    ).trim();
    const defaultCashfreeEnv = (process.env.CASHFREE_ENV || "TEST").trim();
    const defaultCashfreeAppId = (process.env.CASHFREE_APP_ID || "").trim();
    const defaultCashfreeSecretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();
    const defaultCashfreeApiVersion = (process.env.CASHFREE_API_VERSION || "2023-08-01").trim();

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

    // Cashfree dynamic keys: fallback to .env if not yet in DB
    const cashfreeEnv = (configMap["cashfree_env"] || defaultCashfreeEnv || "TEST").trim().toUpperCase();
    const cashfreeAppId = (configMap["cashfree_app_id"] || defaultCashfreeAppId).trim();
    const cashfreeSecretKey = (configMap["cashfree_secret_key"] || defaultCashfreeSecretKey).trim();
    const cashfreeApiVersion = (configMap["cashfree_api_version"] || defaultCashfreeApiVersion || "2023-08-01").trim();

    cachedConfig = {
      hubUrl: cleanMultiUrls(configMap["hub_url"]),
      adminApiKey: configMap["admin_api_key"].trim(),
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeApiVersion,
      lastFetched: Date.now(),
    };

    logger.info(
      `Loaded payment_hub_config from database: hub_url=${cachedConfig.hubUrl}, cashfree_env=${cashfreeEnv}, cashfree_app_id=${cashfreeAppId ? "configured" : "none"}`
    );
  } catch (err: any) {
    logger.warn(`Failed to init payment_hub_config from database: ${err.message}`);
  }
}

/**
 * Save Hub URL, Admin API Key, and Cashfree Gateway Credentials to database.
 */
export async function saveHubConfig(params: {
  hubUrl?: string;
  adminApiKey?: string;
  cashfreeEnv?: string;
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  cashfreeApiVersion?: string;
}): Promise<{
  hubUrl: string;
  adminApiKey: string;
  cashfreeEnv: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeApiVersion: string;
}> {
  const updates: Promise<any>[] = [];

  let newHubUrl = cachedConfig.hubUrl;
  let newAdminKey = cachedConfig.adminApiKey;
  let newCfEnv = cachedConfig.cashfreeEnv;
  let newCfAppId = cachedConfig.cashfreeAppId;
  let newCfSecretKey = cachedConfig.cashfreeSecretKey;
  let newCfApiVersion = cachedConfig.cashfreeApiVersion;

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

  if (params.cashfreeEnv) {
    newCfEnv = params.cashfreeEnv.trim().toUpperCase();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_env" },
        update: { value: newCfEnv },
        create: { key: "cashfree_env", value: newCfEnv },
      })
    );
  }

  if (params.cashfreeAppId !== undefined) {
    newCfAppId = params.cashfreeAppId.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_app_id" },
        update: { value: newCfAppId },
        create: { key: "cashfree_app_id", value: newCfAppId },
      })
    );
  }

  if (params.cashfreeSecretKey !== undefined && params.cashfreeSecretKey.trim().length > 0) {
    newCfSecretKey = params.cashfreeSecretKey.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_secret_key" },
        update: { value: newCfSecretKey },
        create: { key: "cashfree_secret_key", value: newCfSecretKey },
      })
    );
  }

  if (params.cashfreeApiVersion) {
    newCfApiVersion = params.cashfreeApiVersion.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_api_version" },
        update: { value: newCfApiVersion },
        create: { key: "cashfree_api_version", value: newCfApiVersion },
      })
    );
  }

  await Promise.all(updates);

  // Update memory cache immediately
  cachedConfig = {
    hubUrl: newHubUrl,
    adminApiKey: newAdminKey,
    cashfreeEnv: newCfEnv,
    cashfreeAppId: newCfAppId,
    cashfreeSecretKey: newCfSecretKey,
    cashfreeApiVersion: newCfApiVersion,
    lastFetched: Date.now(),
  };

  logger.info(`Updated payment_hub_config in database: hub_url=${newHubUrl}, cashfree_env=${newCfEnv}`);
  return {
    hubUrl: newHubUrl,
    adminApiKey: newAdminKey,
    cashfreeEnv: newCfEnv,
    cashfreeAppId: newCfAppId,
    cashfreeSecretKey: newCfSecretKey,
    cashfreeApiVersion: newCfApiVersion,
  };
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
export async function getHubConfig(): Promise<{
  hubUrl: string;
  adminApiKey: string;
  cashfreeEnv: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeApiVersion: string;
}> {
  const now = Date.now();
  if (now - cachedConfig.lastFetched < CACHE_TTL_MS) {
    return {
      hubUrl: cachedConfig.hubUrl,
      adminApiKey: cachedConfig.adminApiKey,
      cashfreeEnv: cachedConfig.cashfreeEnv,
      cashfreeAppId: cachedConfig.cashfreeAppId,
      cashfreeSecretKey: cachedConfig.cashfreeSecretKey,
      cashfreeApiVersion: cachedConfig.cashfreeApiVersion,
    };
  }

  try {
    const rows = await prisma.paymentHubConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const row of rows) {
      configMap[row.key] = row.value;
    }

    const hubUrl = cleanMultiUrls(configMap["hub_url"] || cachedConfig.hubUrl);
    const adminApiKey = (configMap["admin_api_key"] || cachedConfig.adminApiKey).trim();
    const cashfreeEnv = (configMap["cashfree_env"] || cachedConfig.cashfreeEnv || "TEST").trim().toUpperCase();
    const cashfreeAppId = (configMap["cashfree_app_id"] || cachedConfig.cashfreeAppId).trim();
    const cashfreeSecretKey = (configMap["cashfree_secret_key"] || cachedConfig.cashfreeSecretKey).trim();
    const cashfreeApiVersion = (configMap["cashfree_api_version"] || cachedConfig.cashfreeApiVersion || "2023-08-01").trim();

    cachedConfig = {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeApiVersion,
      lastFetched: now,
    };

    return {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeApiVersion,
    };
  } catch (err: any) {
    return {
      hubUrl: cachedConfig.hubUrl,
      adminApiKey: cachedConfig.adminApiKey,
      cashfreeEnv: cachedConfig.cashfreeEnv,
      cashfreeAppId: cachedConfig.cashfreeAppId,
      cashfreeSecretKey: cachedConfig.cashfreeSecretKey,
      cashfreeApiVersion: cachedConfig.cashfreeApiVersion,
    };
  }
}

/**
 * Synchronous getter for Cashfree credentials using in-memory cache
 * Priority: Database (payment_hub_config) -> Fallback: Environment variables (.env)
 */
export function getCachedCashfreeConfig(): {
  appId: string;
  secretKey: string;
  env: string;
  apiVersion: string;
  isProd: boolean;
  baseUrl: string;
} {
  ensureBackgroundInit();
  const env = (cachedConfig.cashfreeEnv || process.env.CASHFREE_ENV || "TEST").trim().toUpperCase();
  const isProd = env === "PRODUCTION";
  const appId = (cachedConfig.cashfreeAppId || process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (cachedConfig.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY || "").trim();
  const apiVersion = (cachedConfig.cashfreeApiVersion || process.env.CASHFREE_API_VERSION || "2023-08-01").trim();
  const baseUrl = isProd
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  return { appId, secretKey, env, apiVersion, isProd, baseUrl };
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
