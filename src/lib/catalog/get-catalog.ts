/**
 * Cached runtime catalog entry point.
 * Inside `'use cache'`: sheet failures throw (Next keeps the previous entry
 * on background revalidation errors). Snapshot is only returned outside.
 *
 * Import from `@/lib/catalog/get-catalog` — not from `@/lib/catalog` (client-safe barrel).
 */

import { cacheLife } from "next/cache";

import { getEnv } from "@/env";

import {
  buildSnapshotResult,
  loadCatalogFromSheet,
  readCatalogCacheRevalidateSeconds,
  resolveCatalogWithFallback,
  type CatalogRuntimeResult,
} from "./runtime";

async function getCatalogFromSheetCached(
  url: string,
): Promise<CatalogRuntimeResult> {
  "use cache";
  const revalidate = readCatalogCacheRevalidateSeconds();
  // Production (~300s): expire ≥ 1h keeps the route in the static shell.
  // Short TTL (smoke / CATALOG_CACHE_REVALIDATE_SECONDS < 60): allow a
  // dynamic hole so revalidation is observable within seconds.
  const expire =
    revalidate < 60
      ? Math.max(revalidate * 2, 60)
      : Math.max(revalidate * 2, 3600);
  cacheLife({
    stale: revalidate,
    revalidate,
    expire,
  });

  return loadCatalogFromSheet({ url });
}

/**
 * Runtime catalog: sheet when possible, otherwise build snapshot.
 * Return value is serializable (`data` + `meta`); status APIs must read `meta`.
 */
export async function getCatalog(): Promise<CatalogRuntimeResult> {
  const url = getEnv().catalogCsvUrl;
  if (!url) {
    return buildSnapshotResult([]);
  }

  return resolveCatalogWithFallback(() => getCatalogFromSheetCached(url));
}
