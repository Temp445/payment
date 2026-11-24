import { prisma } from "./prisma";
import { logger } from "./logger";

interface HubConfigCache {
  hubUrl: string;
  adminApiKey: string;
  cashfreeEnv: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeTestAppId: string;
  cashfreeTestSecretKey: string;
  cashfreeProdAppId: string;
  cashfreeProdSecretKey: string;
  cashfreeApiVersion: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpUseTls: boolean;
  defaultFromEmail: string;
  defaultFromName: string;
  lastFetched: number;
}

const CACHE_TTL_MS = 30 * 1000; // 30-second in-memory cache

let cachedConfig: HubConfigCache = {
  hubUrl: "",
  adminApiKey: "",
  cashfreeEnv: "TEST",
  cashfreeAppId: "",
  cashfreeSecretKey: "",
  cashfreeTestAppId: "",
  cashfreeTestSecretKey: "",
  cashfreeProdAppId: "",
  cashfreeProdSecretKey: "",
  cashfreeApiVersion: "2023-08-01",
  smtpHost: "",
  smtpPort: 465,
  smtpUsername: "",
  smtpPassword: "",
  smtpUseTls: true,
  defaultFromEmail: "",
  defaultFromName: "Ace Payment Hub",
  lastFetched: 0,
};

let initPromise: Promise<void> | null = null;

/**
 * Ensures database configuration is fully loaded into memory before proceeding.
 * Critical for serverless environments (Netlify / Vercel / AWS Lambda) to prevent cold-start race conditions.
 */
export async function ensureHubConfigLoaded(): Promise<HubConfigCache> {
  const now = Date.now();
  if (cachedConfig.lastFetched > 0 && now - cachedConfig.lastFetched < CACHE_TTL_MS) {
    return cachedConfig;
  }
  if (!initPromise) {
    initPromise = initHubConfig();
  }
  await initPromise;
  initPromise = null;
  return cachedConfig;
}

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

    // Cashfree gateway credentials, admin key, & Hub URL: fetched directly from database (payment_hub_config)
    const hubUrl = cleanMultiUrls(configMap["hub_url"] || "");
    const adminApiKey = (configMap["admin_api_key"] || "").trim();
    const cashfreeEnv = (configMap["cashfree_env"] || "TEST").trim().toUpperCase();

    // Dual Test & Production credentials with backward-compatible fallback to legacy keys
    const cashfreeTestAppId = (configMap["cashfree_test_app_id"] || configMap["cashfree_app_id"] || "").trim();
    const cashfreeTestSecretKey = (configMap["cashfree_test_secret_key"] || configMap["cashfree_secret_key"] || "").trim();
    const cashfreeProdAppId = (configMap["cashfree_prod_app_id"] || (cashfreeEnv === "PRODUCTION" ? configMap["cashfree_app_id"] : "") || "").trim();
    const cashfreeProdSecretKey = (configMap["cashfree_prod_secret_key"] || (cashfreeEnv === "PRODUCTION" ? configMap["cashfree_secret_key"] : "") || "").trim();

    // Active credentials derived from active environment
    const cashfreeAppId = cashfreeEnv === "PRODUCTION" ? (cashfreeProdAppId || cashfreeTestAppId) : (cashfreeTestAppId || cashfreeProdAppId);
    const cashfreeSecretKey = cashfreeEnv === "PRODUCTION" ? (cashfreeProdSecretKey || cashfreeTestSecretKey) : (cashfreeTestSecretKey || cashfreeProdSecretKey);
    const cashfreeApiVersion = (configMap["cashfree_api_version"] || "2023-08-01").trim();

    // Outbound SMTP email settings
    const smtpHost = (configMap["smtp_host"] || process.env.SMTP_HOST || "").trim();
    const smtpPort = Number(configMap["smtp_port"] || process.env.SMTP_PORT || 465);
    const smtpUsername = (configMap["smtp_username"] || process.env.SMTP_USER || "").trim();
    const smtpPassword = (configMap["smtp_password"] || process.env.SMTP_PASSWORD || "").trim();
    const smtpUseTls = configMap["smtp_use_tls"] !== "false";
    const defaultFromEmail = (configMap["default_from_email"] || process.env.SMTP_FROM_EMAIL || smtpUsername).trim();
    const defaultFromName = (configMap["default_from_name"] || "Ace Payment Hub").trim();

    cachedConfig = {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeTestAppId,
      cashfreeTestSecretKey,
      cashfreeProdAppId,
      cashfreeProdSecretKey,
      cashfreeApiVersion,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpUseTls,
      defaultFromEmail,
      defaultFromName,
      lastFetched: Date.now(),
    };

    logger.info(
      `Loaded payment_hub_config from database: hub_url=${cachedConfig.hubUrl}, cashfree_env=${cashfreeEnv}, test_configured=${Boolean(cashfreeTestAppId)}, prod_configured=${Boolean(cashfreeProdAppId)}`
    );
  } catch (err: any) {
    logger.warn(`Failed to init payment_hub_config from database: ${err.message}`);
  }
}

/**
 * Save Hub URL, Admin API Key, Cashfree Credentials, and SMTP Email Settings to database.
 */
export async function saveHubConfig(params: {
  hubUrl?: string;
  adminApiKey?: string;
  cashfreeEnv?: string;
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  cashfreeTestAppId?: string;
  cashfreeTestSecretKey?: string;
  cashfreeProdAppId?: string;
  cashfreeProdSecretKey?: string;
  cashfreeApiVersion?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpUseTls?: boolean;
  defaultFromEmail?: string;
  defaultFromName?: string;
}): Promise<HubConfigCache> {
  const updates: Promise<any>[] = [];

  let newHubUrl = cachedConfig.hubUrl;
  let newAdminKey = cachedConfig.adminApiKey;
  let newCfEnv = cachedConfig.cashfreeEnv;
  let newCfTestAppId = cachedConfig.cashfreeTestAppId;
  let newCfTestSecretKey = cachedConfig.cashfreeTestSecretKey;
  let newCfProdAppId = cachedConfig.cashfreeProdAppId;
  let newCfProdSecretKey = cachedConfig.cashfreeProdSecretKey;
  let newCfApiVersion = cachedConfig.cashfreeApiVersion;
  let newSmtpHost = cachedConfig.smtpHost;
  let newSmtpPort = cachedConfig.smtpPort;
  let newSmtpUsername = cachedConfig.smtpUsername;
  let newSmtpPassword = cachedConfig.smtpPassword;
  let newSmtpUseTls = cachedConfig.smtpUseTls;
  let newDefaultFromEmail = cachedConfig.defaultFromEmail;
  let newDefaultFromName = cachedConfig.defaultFromName;

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

  // Handle Test Credentials
  if (params.cashfreeTestAppId !== undefined) {
    newCfTestAppId = params.cashfreeTestAppId.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_test_app_id" },
        update: { value: newCfTestAppId },
        create: { key: "cashfree_test_app_id", value: newCfTestAppId },
      })
    );
  }

  if (params.cashfreeTestSecretKey !== undefined && params.cashfreeTestSecretKey.trim().length > 0) {
    newCfTestSecretKey = params.cashfreeTestSecretKey.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_test_secret_key" },
        update: { value: newCfTestSecretKey },
        create: { key: "cashfree_test_secret_key", value: newCfTestSecretKey },
      })
    );
  }

  // Handle Prod Credentials
  if (params.cashfreeProdAppId !== undefined) {
    newCfProdAppId = params.cashfreeProdAppId.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_prod_app_id" },
        update: { value: newCfProdAppId },
        create: { key: "cashfree_prod_app_id", value: newCfProdAppId },
      })
    );
  }

  if (params.cashfreeProdSecretKey !== undefined && params.cashfreeProdSecretKey.trim().length > 0) {
    newCfProdSecretKey = params.cashfreeProdSecretKey.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_prod_secret_key" },
        update: { value: newCfProdSecretKey },
        create: { key: "cashfree_prod_secret_key", value: newCfProdSecretKey },
      })
    );
  }

  // Legacy single key compatibility if provided
  if (params.cashfreeAppId !== undefined) {
    const singleAppId = params.cashfreeAppId.trim();
    if (newCfEnv === "PRODUCTION") {
      newCfProdAppId = singleAppId;
      updates.push(
        prisma.paymentHubConfig.upsert({
          where: { key: "cashfree_prod_app_id" },
          update: { value: singleAppId },
          create: { key: "cashfree_prod_app_id", value: singleAppId },
        })
      );
    } else {
      newCfTestAppId = singleAppId;
      updates.push(
        prisma.paymentHubConfig.upsert({
          where: { key: "cashfree_test_app_id" },
          update: { value: singleAppId },
          create: { key: "cashfree_test_app_id", value: singleAppId },
        })
      );
    }
  }

  if (params.cashfreeSecretKey !== undefined && params.cashfreeSecretKey.trim().length > 0) {
    const singleSecretKey = params.cashfreeSecretKey.trim();
    if (newCfEnv === "PRODUCTION") {
      newCfProdSecretKey = singleSecretKey;
      updates.push(
        prisma.paymentHubConfig.upsert({
          where: { key: "cashfree_prod_secret_key" },
          update: { value: singleSecretKey },
          create: { key: "cashfree_prod_secret_key", value: singleSecretKey },
        })
      );
    } else {
      newCfTestSecretKey = singleSecretKey;
      updates.push(
        prisma.paymentHubConfig.upsert({
          where: { key: "cashfree_test_secret_key" },
          update: { value: singleSecretKey },
          create: { key: "cashfree_test_secret_key", value: singleSecretKey },
        })
      );
    }
  }

  // Derive active keys to keep legacy cashfree_app_id and cashfree_secret_key rows synchronized
  const activeAppId = newCfEnv === "PRODUCTION" ? (newCfProdAppId || newCfTestAppId) : (newCfTestAppId || newCfProdAppId);
  const activeSecretKey = newCfEnv === "PRODUCTION" ? (newCfProdSecretKey || newCfTestSecretKey) : (newCfTestSecretKey || newCfProdSecretKey);

  if (activeAppId) {
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_app_id" },
        update: { value: activeAppId },
        create: { key: "cashfree_app_id", value: activeAppId },
      })
    );
  }

  if (activeSecretKey) {
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "cashfree_secret_key" },
        update: { value: activeSecretKey },
        create: { key: "cashfree_secret_key", value: activeSecretKey },
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

  // SMTP Settings
  if (params.smtpHost !== undefined) {
    newSmtpHost = params.smtpHost.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "smtp_host" },
        update: { value: newSmtpHost },
        create: { key: "smtp_host", value: newSmtpHost },
      })
    );
  }

  if (params.smtpPort !== undefined) {
    newSmtpPort = Number(params.smtpPort) || 465;
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "smtp_port" },
        update: { value: String(newSmtpPort) },
        create: { key: "smtp_port", value: String(newSmtpPort) },
      })
    );
  }

  if (params.smtpUsername !== undefined) {
    newSmtpUsername = params.smtpUsername.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "smtp_username" },
        update: { value: newSmtpUsername },
        create: { key: "smtp_username", value: newSmtpUsername },
      })
    );
  }

  if (params.smtpPassword !== undefined && params.smtpPassword.trim().length > 0) {
    newSmtpPassword = params.smtpPassword.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "smtp_password" },
        update: { value: newSmtpPassword },
        create: { key: "smtp_password", value: newSmtpPassword },
      })
    );
  }

  if (params.smtpUseTls !== undefined) {
    newSmtpUseTls = params.smtpUseTls;
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "smtp_use_tls" },
        update: { value: String(newSmtpUseTls) },
        create: { key: "smtp_use_tls", value: String(newSmtpUseTls) },
      })
    );
  }

  if (params.defaultFromEmail !== undefined) {
    newDefaultFromEmail = params.defaultFromEmail.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "default_from_email" },
        update: { value: newDefaultFromEmail },
        create: { key: "default_from_email", value: newDefaultFromEmail },
      })
    );
  }

  if (params.defaultFromName !== undefined) {
    newDefaultFromName = params.defaultFromName.trim();
    updates.push(
      prisma.paymentHubConfig.upsert({
        where: { key: "default_from_name" },
        update: { value: newDefaultFromName },
        create: { key: "default_from_name", value: newDefaultFromName },
      })
    );
  }

  await Promise.all(updates);

  // Update memory cache immediately
  cachedConfig = {
    hubUrl: newHubUrl,
    adminApiKey: newAdminKey,
    cashfreeEnv: newCfEnv,
    cashfreeAppId: activeAppId,
    cashfreeSecretKey: activeSecretKey,
    cashfreeTestAppId: newCfTestAppId,
    cashfreeTestSecretKey: newCfTestSecretKey,
    cashfreeProdAppId: newCfProdAppId,
    cashfreeProdSecretKey: newCfProdSecretKey,
    cashfreeApiVersion: newCfApiVersion,
    smtpHost: newSmtpHost,
    smtpPort: newSmtpPort,
    smtpUsername: newSmtpUsername,
    smtpPassword: newSmtpPassword,
    smtpUseTls: newSmtpUseTls,
    defaultFromEmail: newDefaultFromEmail,
    defaultFromName: newDefaultFromName,
    lastFetched: Date.now(),
  };

  logger.info(`Updated payment_hub_config in database: hub_url=${newHubUrl}, smtp_host=${newSmtpHost ? "configured" : "none"}`);
  return cachedConfig;
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
export async function getHubConfig(): Promise<Omit<HubConfigCache, "lastFetched">> {
  const now = Date.now();
  if (now - cachedConfig.lastFetched < CACHE_TTL_MS) {
    return {
      hubUrl: cachedConfig.hubUrl,
      adminApiKey: cachedConfig.adminApiKey,
      cashfreeEnv: cachedConfig.cashfreeEnv,
      cashfreeAppId: cachedConfig.cashfreeAppId,
      cashfreeSecretKey: cachedConfig.cashfreeSecretKey,
      cashfreeTestAppId: cachedConfig.cashfreeTestAppId,
      cashfreeTestSecretKey: cachedConfig.cashfreeTestSecretKey,
      cashfreeProdAppId: cachedConfig.cashfreeProdAppId,
      cashfreeProdSecretKey: cachedConfig.cashfreeProdSecretKey,
      cashfreeApiVersion: cachedConfig.cashfreeApiVersion,
      smtpHost: cachedConfig.smtpHost,
      smtpPort: cachedConfig.smtpPort,
      smtpUsername: cachedConfig.smtpUsername,
      smtpPassword: cachedConfig.smtpPassword ? "••••••••" : "",
      smtpUseTls: cachedConfig.smtpUseTls,
      defaultFromEmail: cachedConfig.defaultFromEmail,
      defaultFromName: cachedConfig.defaultFromName,
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

    const cashfreeTestAppId = (configMap["cashfree_test_app_id"] || configMap["cashfree_app_id"] || cachedConfig.cashfreeTestAppId || "").trim();
    const cashfreeTestSecretKey = (configMap["cashfree_test_secret_key"] || configMap["cashfree_secret_key"] || cachedConfig.cashfreeTestSecretKey || "").trim();
    const cashfreeProdAppId = (configMap["cashfree_prod_app_id"] || (cashfreeEnv === "PRODUCTION" ? configMap["cashfree_app_id"] : "") || cachedConfig.cashfreeProdAppId || "").trim();
    const cashfreeProdSecretKey = (configMap["cashfree_prod_secret_key"] || (cashfreeEnv === "PRODUCTION" ? configMap["cashfree_secret_key"] : "") || cachedConfig.cashfreeProdSecretKey || "").trim();

    const cashfreeAppId = cashfreeEnv === "PRODUCTION" ? (cashfreeProdAppId || cashfreeTestAppId) : (cashfreeTestAppId || cashfreeProdAppId);
    const cashfreeSecretKey = cashfreeEnv === "PRODUCTION" ? (cashfreeProdSecretKey || cashfreeTestSecretKey) : (cashfreeTestSecretKey || cashfreeProdSecretKey);
    const cashfreeApiVersion = (configMap["cashfree_api_version"] || cachedConfig.cashfreeApiVersion || "2023-08-01").trim();

    const smtpHost = (configMap["smtp_host"] || process.env.SMTP_HOST || cachedConfig.smtpHost).trim();
    const smtpPort = Number(configMap["smtp_port"] || process.env.SMTP_PORT || cachedConfig.smtpPort || 465);
    const smtpUsername = (configMap["smtp_username"] || process.env.SMTP_USER || cachedConfig.smtpUsername).trim();
    const smtpPassword = (configMap["smtp_password"] || process.env.SMTP_PASSWORD || cachedConfig.smtpPassword).trim();
    const smtpUseTls = configMap["smtp_use_tls"] !== undefined ? configMap["smtp_use_tls"] !== "false" : cachedConfig.smtpUseTls;
    const defaultFromEmail = (configMap["default_from_email"] || process.env.SMTP_FROM_EMAIL || cachedConfig.defaultFromEmail || smtpUsername).trim();
    const defaultFromName = (configMap["default_from_name"] || cachedConfig.defaultFromName || "Ace Payment Hub").trim();

    cachedConfig = {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeTestAppId,
      cashfreeTestSecretKey,
      cashfreeProdAppId,
      cashfreeProdSecretKey,
      cashfreeApiVersion,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpUseTls,
      defaultFromEmail,
      defaultFromName,
      lastFetched: now,
    };

    return {
      hubUrl,
      adminApiKey,
      cashfreeEnv,
      cashfreeAppId,
      cashfreeSecretKey,
      cashfreeTestAppId,
      cashfreeTestSecretKey,
      cashfreeProdAppId,
      cashfreeProdSecretKey,
      cashfreeApiVersion,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword: smtpPassword ? "••••••••" : "",
      smtpUseTls,
      defaultFromEmail,
      defaultFromName,
    };
  } catch (err: any) {
    return {
      hubUrl: cachedConfig.hubUrl,
      adminApiKey: cachedConfig.adminApiKey,
      cashfreeEnv: cachedConfig.cashfreeEnv,
      cashfreeAppId: cachedConfig.cashfreeAppId,
      cashfreeSecretKey: cachedConfig.cashfreeSecretKey,
      cashfreeTestAppId: cachedConfig.cashfreeTestAppId,
      cashfreeTestSecretKey: cachedConfig.cashfreeTestSecretKey,
      cashfreeProdAppId: cachedConfig.cashfreeProdAppId,
      cashfreeProdSecretKey: cachedConfig.cashfreeProdSecretKey,
      cashfreeApiVersion: cachedConfig.cashfreeApiVersion,
      smtpHost: cachedConfig.smtpHost,
      smtpPort: cachedConfig.smtpPort,
      smtpUsername: cachedConfig.smtpUsername,
      smtpPassword: cachedConfig.smtpPassword ? "••••••••" : "",
      smtpUseTls: cachedConfig.smtpUseTls,
      defaultFromEmail: cachedConfig.defaultFromEmail,
      defaultFromName: cachedConfig.defaultFromName,
    };
  }
}

/**
 * Synchronous getter for SMTP email configuration
 */
export function getCachedEmailConfig(): {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpUseTls: boolean;
  defaultFromEmail: string;
  defaultFromName: string;
  isConfigured: boolean;
} {
  ensureBackgroundInit();
  const host = cachedConfig.smtpHost || process.env.SMTP_HOST || "";
  const port = cachedConfig.smtpPort || Number(process.env.SMTP_PORT || 465);
  const user = cachedConfig.smtpUsername || process.env.SMTP_USER || "";
  const pass = cachedConfig.smtpPassword || process.env.SMTP_PASSWORD || "";
  const useTls = cachedConfig.smtpUseTls;
  const fromEmail = cachedConfig.defaultFromEmail || process.env.SMTP_FROM_EMAIL || user;
  const fromName = cachedConfig.defaultFromName || "Ace Payment Hub";
  const isConfigured = Boolean(host && user && pass);

  return {
    smtpHost: host,
    smtpPort: port,
    smtpUsername: user,
    smtpPassword: pass,
    smtpUseTls: useTls,
    defaultFromEmail: fromEmail,
    defaultFromName: fromName,
    isConfigured,
  };
}

/**
 * Synchronous getter for Cashfree credentials using in-memory cache directly from database
 */
export function getCachedCashfreeConfig(): {
  appId: string;
  secretKey: string;
  testAppId: string;
  testSecretKey: string;
  prodAppId: string;
  prodSecretKey: string;
  env: string;
  apiVersion: string;
  isProd: boolean;
  baseUrl: string;
} {
  ensureBackgroundInit();
  const env = (cachedConfig.cashfreeEnv || "TEST").trim().toUpperCase();
  const isProd = env === "PRODUCTION";

  const testAppId = (cachedConfig.cashfreeTestAppId || cachedConfig.cashfreeAppId || "").trim();
  const testSecretKey = (cachedConfig.cashfreeTestSecretKey || cachedConfig.cashfreeSecretKey || "").trim();
  const prodAppId = (cachedConfig.cashfreeProdAppId || "").trim();
  const prodSecretKey = (cachedConfig.cashfreeProdSecretKey || "").trim();

  // Active credentials selected based on current active environment mode
  const appId = isProd ? (prodAppId || testAppId) : (testAppId || prodAppId);
  const secretKey = isProd ? (prodSecretKey || testSecretKey) : (testSecretKey || prodSecretKey);
  const apiVersion = (cachedConfig.cashfreeApiVersion || "2023-08-01").trim();
  const baseUrl = isProd
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  return { appId, secretKey, testAppId, testSecretKey, prodAppId, prodSecretKey, env, apiVersion, isProd, baseUrl };
}

/**
 * Synchronous getter. If a preferredOrigin is passed (e.g. from current request),
 * it returns that origin if it matches one of the configured URLs, otherwise returns primary.
 */
export function getCachedHubUrl(preferredOrigin?: string): string {
  ensureBackgroundInit();

  if (preferredOrigin) {
    const cleanPreferred = preferredOrigin.trim().replace(/\/$/, "");
    if (cleanPreferred.startsWith("http://") || cleanPreferred.startsWith("https://")) {
      return cleanPreferred;
    }
  }

  const list = getHubUrls();
  if (list.length > 0) {
    return list[0];
  }

  return "http://localhost:3000";
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
