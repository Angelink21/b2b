/**
 * Runtime catalog load from CATALOG_CSV_URL with snapshot fallback helpers.
 * Network/cooldown logic lives here (testable without `'use cache'`).
 */

import generated from "@/data/catalog.generated.json";
import indexJson from "@/data/catalog.index.json";
import metaJson from "@/data/catalog.meta.json";

import { getEnv } from "@/env";

import {
  CatalogCsvError,
  describeCsvUrl,
  fetchCatalogCsvText,
  type FetchCatalogCsv,
} from "./csv-source";
import { presentSeriesDescription } from "./parse";
import {
  buildCatalogFromCsvText,
  checkCatalogShrink,
  looksLikeHtmlNotCsv,
  toCatalogPayloads,
} from "./pipeline";
import type { CatalogIndexItem, Product, Series } from "./schema";

/** Strip absolute URLs from log/error text so sheet addresses never leak. */
export function redactCatalogSecrets(message: string): string {
  return message
    .replace(/https?:\/\/[^\s)'"`]+/gi, "[redacted-url]")
    .replace(
      /docs\.google\.com\/spreadsheets\/[^\s)'"`]+/gi,
      "docs.google.com/[redacted]",
    );
}

/** Build stays at 20s / 3 attempts in csv-source defaults; runtime is tighter. */
export const RUNTIME_FETCH_TIMEOUT_MS = 5_000;
/** Initial attempt + one retry. */
export const RUNTIME_FETCH_RETRIES = 2;
export const SHEET_COOLDOWN_MS = 60_000;
export const DEFAULT_CACHE_REVALIDATE_SECONDS = 300;

export type CatalogRuntimeSource = "sheet" | "snapshot";

export type CatalogRuntimeMeta = {
  fetchedAt: string;
  source: CatalogRuntimeSource;
  modelCount: number;
  errors: string[];
};

export type CatalogRuntimeData = {
  products: Product[];
  series: Series[];
  index: CatalogIndexItem[];
};

export type CatalogRuntimeResult = {
  data: CatalogRuntimeData;
  meta: CatalogRuntimeMeta;
};

type SnapshotMetaFile = {
  modelCount?: number;
  builtAt?: string;
  source?: string;
};

const snapshotGenerated = generated as {
  products: Product[];
  series: Series[];
  generatedAt: string;
};
const snapshotIndex = indexJson as { products: CatalogIndexItem[] };
const snapshotMeta = metaJson as SnapshotMetaFile;

/** Avalanche guard only — not used for /api/catalog-status. */
let sheetCooldownUntilMs = 0;
let sheetCooldownErrors: string[] = [];
let nowFn: () => number = () => Date.now();

export function __resetSheetCooldownForTests(): void {
  sheetCooldownUntilMs = 0;
  sheetCooldownErrors = [];
}

export function __setNowForTests(fn: (() => number) | null): void {
  nowFn = fn ?? (() => Date.now());
}

export function getSheetCooldownRemainingMs(): number {
  return Math.max(0, sheetCooldownUntilMs - nowFn());
}

function armSheetCooldown(errors: string[]): void {
  sheetCooldownUntilMs = nowFn() + SHEET_COOLDOWN_MS;
  sheetCooldownErrors = [...errors];
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function getSnapshotBaselineCount(): number {
  return snapshotMeta.modelCount ?? snapshotGenerated.products.length;
}

export function buildSnapshotResult(errors: string[] = []): CatalogRuntimeResult {
  const products = snapshotGenerated.products;
  // Stable timestamp from build artifacts — `Date.now()` here blocks Next
  // prerender when CATALOG_CSV_URL is empty (e2e / offline snapshot).
  const fetchedAt =
    snapshotMeta.builtAt ??
    snapshotGenerated.generatedAt ??
    "1970-01-01T00:00:00.000Z";
  return {
    data: {
      products,
      // Polish description blocks at read time — do not rewrite catalog JSON.
      series: snapshotGenerated.series.map((s) =>
        presentSeriesDescription(s),
      ),
      index: snapshotIndex.products,
    },
    meta: {
      fetchedAt,
      source: "snapshot",
      modelCount: products.length,
      errors: [...errors],
    },
  };
}

export type LoadCatalogFromSheetOptions = {
  url: string;
  fetchImpl?: FetchCatalogCsv;
  timeoutMs?: number;
  retries?: number;
  allowShrink?: boolean;
  baselineCount?: number;
};

/**
 * Fetch + parse sheet. Throws on any failure (so `'use cache'` keeps the
 * previous entry on background revalidation errors).
 * Sets a 60s cooldown after network/HTML failures (no further fetches).
 */
export async function loadCatalogFromSheet(
  opts: LoadCatalogFromSheetOptions,
): Promise<CatalogRuntimeResult> {
  const now = nowFn();
  if (now < sheetCooldownUntilMs) {
    const errors =
      sheetCooldownErrors.length > 0
        ? sheetCooldownErrors
        : ["catalog sheet cooldown active"];
    throw new CatalogCsvError(
      `catalog sheet cooldown (${Math.ceil((sheetCooldownUntilMs - now) / 1000)}s): ${errors[0]}`,
    );
  }

  const label = describeCsvUrl(opts.url);
  let text: string;
  try {
    text = await fetchCatalogCsvText(opts.url, {
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
      timeoutMs: opts.timeoutMs ?? RUNTIME_FETCH_TIMEOUT_MS,
      retries: opts.retries ?? RUNTIME_FETCH_RETRIES,
    });
  } catch (err) {
    const message = redactCatalogSecrets(errorMessage(err));
    console.warn(`[catalog] sheet fetch failed (${label}): ${message}`);
    armSheetCooldown([message]);
    throw err instanceof CatalogCsvError
      ? err
      : new CatalogCsvError(message);
  }

  if (looksLikeHtmlNotCsv(text)) {
    const message = `CSV source returned HTML instead of CSV (${label})`;
    console.warn(`[catalog] ${redactCatalogSecrets(message)}`);
    armSheetCooldown([message]);
    throw new CatalogCsvError(message);
  }

  const pipeline = buildCatalogFromCsvText(text, { mode: "runtime" });
  if (!pipeline.ok) {
    const message = redactCatalogSecrets(
      pipeline.errors.join("; ") || "catalog pipeline failed",
    );
    console.warn(`[catalog] pipeline failed (${label}): ${message}`);
    throw new CatalogCsvError(message);
  }

  const baseline = opts.baselineCount ?? getSnapshotBaselineCount();
  const allowShrink =
    opts.allowShrink ?? getEnv().catalogAllowShrink;
  const shrink = checkCatalogShrink(pipeline.products.length, baseline, {
    allowShrink,
  });
  if (!shrink.ok) {
    const message = redactCatalogSecrets(shrink.message);
    console.warn(`[catalog] ${message}`);
    throw new CatalogCsvError(message);
  }

  const fetchedAt = new Date(nowFn()).toISOString();
  const { generated, index } = toCatalogPayloads(pipeline, fetchedAt);

  // Successful sheet read clears cooldown.
  sheetCooldownUntilMs = 0;
  sheetCooldownErrors = [];

  return {
    data: {
      products: generated.products,
      series: generated.series.map((s) => presentSeriesDescription(s)),
      index: index.products,
    },
    meta: {
      fetchedAt,
      source: "sheet",
      modelCount: generated.products.length,
      errors: [],
    },
  };
}

export function readCatalogCacheRevalidateSeconds(): number {
  try {
    return getEnv().catalogCacheRevalidateSeconds;
  } catch {
    return DEFAULT_CACHE_REVALIDATE_SECONDS;
  }
}

/**
 * Outer resolver: on loader throw, serve build snapshot for this request.
 * Does not write module status — callers read `meta` from the result.
 */
export async function resolveCatalogWithFallback(
  loader: () => Promise<CatalogRuntimeResult>,
): Promise<CatalogRuntimeResult> {
  try {
    return await loader();
  } catch (err) {
    const message = redactCatalogSecrets(errorMessage(err));
    const errors =
      sheetCooldownErrors.length > 0
        ? sheetCooldownErrors.map(redactCatalogSecrets)
        : [message];
    console.warn(`[catalog] serving snapshot: ${errors[0] ?? message}`);
    return buildSnapshotResult(errors);
  }
}
