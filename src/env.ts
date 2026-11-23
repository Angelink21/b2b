import { z } from "zod";

const sinkIdSchema = z.enum(["console", "email", "telegram", "webhook"]);

export type SinkId = z.infer<typeof sinkIdSchema>;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  LEADS_SINKS: z.string().optional(),
  LEADS_RATE_SALT: z.string().optional(),
  LEADS_MIN_FILL_MS: z.string().optional(),
  LEADS_RATE_LIMIT_MAX: z.string().optional(),
  LEADS_RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  LEADS_EMAIL_FROM: z.string().optional(),
  LEADS_EMAIL_TO: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  LEADS_WEBHOOK_URL: z.string().optional(),
  LEADS_WEBHOOK_SECRET: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  ENABLE_STYLEGUIDE: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().optional(),
  /** Runtime Cloudinary probe TTL (seconds). Default 300 — same idea as catalog. */
  IMAGES_CACHE_REVALIDATE_SECONDS: z.string().optional(),
  /** Published Google Sheet CSV URL (runtime + catalog:build). Never log the value. */
  CATALOG_CSV_URL: z.string().optional(),
  CATALOG_ALLOW_SHRINK: z.string().optional(),
  CATALOG_CACHE_REVALIDATE_SECONDS: z.string().optional(),
  /** Bearer for GET /api/catalog-status. Unset → route returns 404 (build must not fail). */
  CATALOG_STATUS_SECRET: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema> & {
  sinks: SinkId[];
  minFillMs: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  rateSalt: string;
  turnstileEnabled: boolean;
  catalogCsvUrl: string | null;
  catalogAllowShrink: boolean;
  catalogCacheRevalidateSeconds: number;
  catalogStatusSecret: string | null;
};

function parseSinks(raw: string | undefined): SinkId[] {
  const parts = (raw ?? "console")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const sinks: SinkId[] = [];
  for (const part of parts) {
    const parsed = sinkIdSchema.safeParse(part);
    if (!parsed.success) continue;
    if (!sinks.includes(parsed.data)) sinks.push(parsed.data);
  }
  return sinks.length > 0 ? sinks : ["console"];
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

let cached: AppEnv | undefined;

/** Typed env access. Safe to call on the server; does not throw on missing optional secrets. */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.parse(process.env);
  const turnstileEnabled = Boolean(
    parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY && parsed.TURNSTILE_SECRET_KEY,
  );
  const catalogCsvUrl = parsed.CATALOG_CSV_URL?.trim() || null;
  const catalogStatusSecret = parsed.CATALOG_STATUS_SECRET?.trim() || null;
  const catalogCacheRevalidateSeconds = Math.max(
    1,
    parsePositiveInt(parsed.CATALOG_CACHE_REVALIDATE_SECONDS, 300) || 300,
  );

  cached = {
    ...parsed,
    sinks: parseSinks(parsed.LEADS_SINKS),
    minFillMs: parsePositiveInt(parsed.LEADS_MIN_FILL_MS, 3000),
    rateLimitMax: parsePositiveInt(parsed.LEADS_RATE_LIMIT_MAX, 8),
    rateLimitWindowMs: parsePositiveInt(
      parsed.LEADS_RATE_LIMIT_WINDOW_MS,
      60 * 60 * 1000,
    ),
    rateSalt: parsed.LEADS_RATE_SALT ?? "fagor-dev-rate-salt",
    turnstileEnabled,
    catalogCsvUrl,
    catalogAllowShrink: parsed.CATALOG_ALLOW_SHRINK === "1",
    catalogCacheRevalidateSeconds,
    catalogStatusSecret,
  };
  return cached;
}

/** Reset cache (tests only). */
export function resetEnvCache(): void {
  cached = undefined;
}
